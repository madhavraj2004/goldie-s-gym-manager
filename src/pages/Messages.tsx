import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, MessageSquare, Search, Check, CheckCheck, UserPlus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Contact {
  user_id: string;
  full_name: string;
  role: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const Messages = () => {
  const { user, role } = useAuth();
  const qc = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts: people the user has existing conversations with
  const { data: contacts } = useQuery({
    queryKey: ["message-contacts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get all messages involving current user to find conversation partners
      const { data: allMsgs } = await supabase
        .from("messages")
        .select("sender_id, receiver_id")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      const partnerIds = new Set<string>();
      allMsgs?.forEach((m) => {
        if (m.sender_id !== user.id) partnerIds.add(m.sender_id);
        if (m.receiver_id !== user.id) partnerIds.add(m.receiver_id);
      });

      if (partnerIds.size === 0) return [];

      const ids = Array.from(partnerIds);
      const [{ data: profiles }, { data: roles }, { data: unreadMsgs }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name").in("user_id", ids),
        supabase.from("user_roles").select("user_id, role").in("user_id", ids),
        supabase.from("messages").select("sender_id").eq("receiver_id", user.id).eq("is_read", false),
      ]);

      const unreadMap: Record<string, number> = {};
      unreadMsgs?.forEach((m) => { unreadMap[m.sender_id] = (unreadMap[m.sender_id] || 0) + 1; });

      return ids.map((id) => ({
        user_id: id,
        full_name: profiles?.find((p) => p.user_id === id)?.full_name || "Unknown",
        role: roles?.find((r) => r.user_id === id)?.role || "member",
        unread: unreadMap[id] || 0,
      })) as Contact[];
    },
    enabled: !!user?.id,
  });

  // Fetch discoverable users for new chat (role-based logic)
  const { data: discoverableUsers } = useQuery({
    queryKey: ["discoverable-users", user?.id, role],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data: allRoles } = await supabase.from("user_roles").select("user_id, role");
      if (!allRoles) return [];

      let allowedIds: string[] = [];

      if (role === "admin") {
        // Admin can message everyone
        allowedIds = allRoles.filter((r) => r.user_id !== user.id).map((r) => r.user_id);
      } else if (role === "trainer") {
        // Trainer: assigned members + admins
        const { data: assignedMembers } = await supabase
          .from("member_profiles")
          .select("user_id")
          .eq("assigned_trainer_id", user.id);
        const memberIds = assignedMembers?.map((m) => m.user_id) || [];
        const adminIds = allRoles.filter((r) => r.role === "admin").map((r) => r.user_id);
        allowedIds = [...new Set([...memberIds, ...adminIds])];
      } else {
        // Member: their assigned trainer + admins
        const { data: myProfile } = await supabase
          .from("member_profiles")
          .select("assigned_trainer_id")
          .eq("user_id", user.id)
          .maybeSingle();
        const adminIds = allRoles.filter((r) => r.role === "admin").map((r) => r.user_id);
        const trainerIds = myProfile?.assigned_trainer_id ? [myProfile.assigned_trainer_id] : [];
        allowedIds = [...new Set([...trainerIds, ...adminIds])];
      }

      if (!allowedIds.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", allowedIds);

      return allowedIds.map((id) => ({
        user_id: id,
        full_name: profiles?.find((p) => p.user_id === id)?.full_name || "Unknown",
        role: allRoles.find((r) => r.user_id === id)?.role || "member",
        unread: 0,
      })) as Contact[];
    },
    enabled: !!user?.id && showNewChat,
  });

  // Messages for selected contact
  const { data: messages } = useQuery({
    queryKey: ["messages", user?.id, selectedContact?.user_id],
    queryFn: async () => {
      if (!user?.id || !selectedContact?.user_id) return [];
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedContact.user_id}),and(sender_id.eq.${selectedContact.user_id},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!user?.id && !!selectedContact?.user_id,
    refetchInterval: 5000,
  });

  // Mark as read
  useEffect(() => {
    if (!user?.id || !selectedContact?.user_id || !messages?.length) return;
    const unread = messages.filter((m) => m.receiver_id === user.id && !m.is_read);
    if (unread.length > 0) {
      supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user.id)
        .eq("sender_id", selectedContact.user_id)
        .eq("is_read", false)
        .then(() => { qc.invalidateQueries({ queryKey: ["message-contacts"] }); });
    }
  }, [messages, user?.id, selectedContact?.user_id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Realtime
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        qc.invalidateQueries({ queryKey: ["messages"] });
        qc.invalidateQueries({ queryKey: ["message-contacts"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedContact?.user_id || !messageText.trim()) return;
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: selectedContact.user_id,
        content: messageText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["message-contacts"] });
    },
  });

  const startNewChat = (contact: Contact) => {
    setSelectedContact(contact);
    setShowNewChat(false);
    // Refresh contacts to include the new one
    qc.invalidateQueries({ queryKey: ["message-contacts"] });
  };

  const filteredContacts = contacts?.filter((c) =>
    c.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const existingContactIds = new Set(contacts?.map((c) => c.user_id) || []);
  const newChatUsers = discoverableUsers?.filter(
    (u) => !existingContactIds.has(u.user_id) && u.full_name.toLowerCase().includes(newChatSearch.toLowerCase())
  );

  const getInitials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display text-3xl font-bold">Messages</h1>
          <Button onClick={() => setShowNewChat(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" /> New Chat
          </Button>
        </div>

        <div className="flex-1 flex gap-4 min-h-0">
          {/* Contacts Sidebar */}
          <Card className={cn("w-80 flex-shrink-0 flex flex-col", selectedContact && "hidden md:flex")}>
            <CardHeader className="pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search contacts..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {filteredContacts?.length ? (
                  filteredContacts.map((contact) => (
                    <button
                      key={contact.user_id}
                      onClick={() => setSelectedContact(contact)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left border-b border-border/50",
                        selectedContact?.user_id === contact.user_id && "bg-primary/10"
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                          {getInitials(contact.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm truncate">{contact.full_name}</p>
                          {contact.unread > 0 && <Badge variant="destructive" className="text-xs ml-1">{contact.unread}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{contact.role}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No conversations yet. Start a new chat!</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className={cn("flex-1 flex flex-col", !selectedContact && "hidden md:flex")}>
            {selectedContact ? (
              <>
                <CardHeader className="pb-3 border-b border-border flex-row items-center gap-3">
                  <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setSelectedContact(null)}>←</Button>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{getInitials(selectedContact.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{selectedContact.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground capitalize">{selectedContact.role}</p>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    <div className="space-y-3">
                      {messages?.map((msg) => {
                        const isMine = msg.sender_id === user?.id;
                        return (
                          <div key={msg.id} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                            <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm", isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md")}>
                              <p>{msg.content}</p>
                              <div className={cn("flex items-center gap-1 mt-1", isMine ? "justify-end" : "justify-start")}>
                                <span className="text-[10px] opacity-70">{format(new Date(msg.created_at), "hh:mm a")}</span>
                                {isMine && (msg.is_read ? <CheckCheck className="h-3 w-3 opacity-70" /> : <Check className="h-3 w-3 opacity-50" />)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>
                <div className="p-3 border-t border-border flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (messageText.trim()) sendMessage.mutate();
                      }
                    }}
                  />
                  <Button size="icon" disabled={!messageText.trim() || sendMessage.isPending} onClick={() => sendMessage.mutate()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center text-center text-muted-foreground">
                <div>
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">Choose a contact or start a new chat</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* New Chat Dialog */}
        <Dialog open={showNewChat} onOpenChange={setShowNewChat}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Start New Chat</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={newChatSearch} onChange={(e) => setNewChatSearch(e.target.value)} className="pl-9" />
              </div>
              <p className="text-xs text-muted-foreground">
                {role === "admin" ? "You can message any user." : role === "trainer" ? "You can message your assigned members and admins." : "You can message your trainer and admins."}
              </p>
              <ScrollArea className="h-64">
                {newChatUsers?.length ? (
                  newChatUsers.map((u) => (
                    <button
                      key={u.user_id}
                      onClick={() => startNewChat(u)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left border-b border-border/50"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{getInitials(u.full_name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{u.full_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{u.role}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {discoverableUsers ? "No new contacts available" : "Loading…"}
                  </p>
                )}
                {/* Also show existing contacts that match search */}
                {contacts?.filter((c) => c.full_name.toLowerCase().includes(newChatSearch.toLowerCase())).map((c) => (
                  <button
                    key={c.user_id}
                    onClick={() => startNewChat(c)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left border-b border-border/50"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">{getInitials(c.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{c.role} · existing chat</p>
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
