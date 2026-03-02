import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useMembers, useTrainersForAssignment, useCreateMember, useUpdateMember, useDeleteMember, MemberWithProfile } from "@/hooks/useMembers";
import { usePlans } from "@/hooks/usePlans";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Pencil, Trash2, Eye, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Members = () => {
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<MemberWithProfile | null>(null);
  const [showDetail, setShowDetail] = useState<MemberWithProfile | null>(null);
  const [showDelete, setShowDelete] = useState<MemberWithProfile | null>(null);

  const { data: members, isLoading } = useMembers(search, statusFilter);
  const { data: trainers } = useTrainersForAssignment();
  const { data: plans } = usePlans();
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();

  const isAdmin = role === "admin";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-display text-3xl font-bold">Members</h1>
          {isAdmin && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Member
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading members...</div>
            ) : !members?.length ? (
              <div className="p-8 text-center text-muted-foreground">No members found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="hidden lg:table-cell">Plan</TableHead>
                     <TableHead className="hidden lg:table-cell">Goal</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(m.profiles?.full_name || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{m.profiles?.full_name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{m.profiles?.phone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={m.membership_status === "active" ? "default" : "secondary"}>
                          {m.membership_status}
                        </Badge>
                      </TableCell>
                       <TableCell className="hidden lg:table-cell">
                         {plans?.find((p) => p.id === m.plan_id)?.name || "—"}
                       </TableCell>
                       <TableCell className="hidden lg:table-cell">{m.fitness_goal || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setShowDetail(m)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => setShowEdit(m)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setShowDelete(m)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Member Dialog */}
      <CreateMemberDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        trainers={trainers || []}
        plans={plans || []}
        onCreate={createMember.mutateAsync}
        isLoading={createMember.isPending}
      />

      {/* Edit Member Dialog */}
      {showEdit && (
        <EditMemberDialog
          member={showEdit}
          onClose={() => setShowEdit(null)}
          trainers={trainers || []}
          plans={plans || []}
          onUpdate={updateMember.mutateAsync}
          isLoading={updateMember.isPending}
        />
      )}

      {/* Detail Dialog */}
      {showDetail && (
        <MemberDetailDialog member={showDetail} onClose={() => setShowDetail(null)} trainers={trainers || []} plans={plans || []} />
      )}

      {/* Delete Confirmation */}
      {showDelete && (
        <Dialog open onOpenChange={() => setShowDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Member</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{showDelete.profiles?.full_name}</strong>? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMember.isPending}
                onClick={async () => {
                  await deleteMember.mutateAsync(showDelete.user_id);
                  setShowDelete(null);
                }}
              >
                {deleteMember.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

/* ---- Sub-components ---- */

function CreateMemberDialog({
  open, onClose, trainers, plans, onCreate, isLoading
}: {
  open: boolean;
  onClose: () => void;
  trainers: { user_id: string; full_name: string | null }[];
  plans: { id: string; name: string; price: number; duration_days: number; is_active: boolean }[];
  onCreate: (input: any) => Promise<any>;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", phone: "",
    weight_kg: "", height_cm: "", date_of_birth: "", gender: "",
    emergency_contact: "", emergency_phone: "", fitness_goal: "",
    medical_notes: "", assigned_trainer_id: "", plan_id: "",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate({
      ...form,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : undefined,
      height_cm: form.height_cm ? Number(form.height_cm) : undefined,
      assigned_trainer_id: form.assigned_trainer_id && form.assigned_trainer_id !== "none" ? form.assigned_trainer_id : undefined,
      plan_id: form.plan_id && form.plan_id !== "none" ? form.plan_id : undefined,
    });
    setForm({
      email: "", password: "", full_name: "", phone: "",
      weight_kg: "", height_cm: "", date_of_birth: "", gender: "",
      emergency_contact: "", emergency_phone: "", fitness_goal: "",
      medical_notes: "", assigned_trainer_id: "", plan_id: "",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add New Member
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={6} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Weight (kg)</Label>
              <Input type="number" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Height (cm)</Label>
              <Input type="number" value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assign Trainer</Label>
              <Select value={form.assigned_trainer_id} onValueChange={(v) => set("assigned_trainer_id", v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {trainers.map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>{t.full_name || "Unnamed"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Membership Plan</Label>
            <Select value={form.plan_id} onValueChange={(v) => set("plan_id", v)}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {plans.filter(p => p.is_active !== false).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — ₹{p.price}/{p.duration_days}d
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Emergency Contact</Label>
              <Input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Emergency Phone</Label>
              <Input value={form.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Fitness Goal</Label>
            <Input value={form.fitness_goal} onChange={(e) => set("fitness_goal", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Medical Notes</Label>
            <Textarea value={form.medical_notes} onChange={(e) => set("medical_notes", e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Member"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditMemberDialog({
  member, onClose, trainers, plans, onUpdate, isLoading
}: {
  member: MemberWithProfile;
  onClose: () => void;
  trainers: { user_id: string; full_name: string | null }[];
  plans: { id: string; name: string; price: number; duration_days: number; is_active: boolean }[];
  onUpdate: (input: any) => Promise<any>;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    weight_kg: member.weight_kg?.toString() || "",
    height_cm: member.height_cm?.toString() || "",
    date_of_birth: member.date_of_birth || "",
    gender: member.gender || "",
    emergency_contact: member.emergency_contact || "",
    emergency_phone: member.emergency_phone || "",
    fitness_goal: member.fitness_goal || "",
    medical_notes: member.medical_notes || "",
    assigned_trainer_id: member.assigned_trainer_id || "",
    membership_status: member.membership_status,
    membership_start: member.membership_start || "",
    membership_end: member.membership_end || "",
    plan_id: member.plan_id || "",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdate({
      userId: member.user_id,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      emergency_contact: form.emergency_contact || null,
      emergency_phone: form.emergency_phone || null,
      fitness_goal: form.fitness_goal || null,
      medical_notes: form.medical_notes || null,
      assigned_trainer_id: form.assigned_trainer_id && form.assigned_trainer_id !== "none" ? form.assigned_trainer_id : null,
      membership_status: form.membership_status,
      membership_start: form.membership_start || null,
      membership_end: form.membership_end || null,
      plan_id: form.plan_id && form.plan_id !== "none" ? form.plan_id : null,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Member: {member.profiles?.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Weight (kg)</Label>
              <Input type="number" value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Height (cm)</Label>
              <Input type="number" value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date of Birth</Label>
              <Input type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Assign Trainer</Label>
              <Select value={form.assigned_trainer_id} onValueChange={(v) => set("assigned_trainer_id", v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {trainers.map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>{t.full_name || "Unnamed"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.membership_status} onValueChange={(v) => set("membership_status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fitness Goal</Label>
              <Input value={form.fitness_goal} onChange={(e) => set("fitness_goal", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Membership Start</Label>
              <Input type="date" value={form.membership_start} onChange={(e) => set("membership_start", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Membership End</Label>
              <Input type="date" value={form.membership_end} onChange={(e) => set("membership_end", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Emergency Contact</Label>
              <Input value={form.emergency_contact} onChange={(e) => set("emergency_contact", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Emergency Phone</Label>
              <Input value={form.emergency_phone} onChange={(e) => set("emergency_phone", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Medical Notes</Label>
            <Textarea value={form.medical_notes} onChange={(e) => set("medical_notes", e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MemberDetailDialog({
  member, onClose, trainers, plans
}: {
  member: MemberWithProfile;
  onClose: () => void;
  trainers: { user_id: string; full_name: string | null }[];
  plans: { id: string; name: string; price: number; duration_days: number; is_active: boolean }[];
}) {
  const bmi = member.weight_kg && member.height_cm
    ? (Number(member.weight_kg) / ((Number(member.height_cm) / 100) ** 2)).toFixed(1)
    : null;

  const trainerName = trainers.find((t) => t.user_id === member.assigned_trainer_id)?.full_name || "Unassigned";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{member.profiles?.full_name || "Member Details"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <DetailRow label="Status" value={<Badge variant={member.membership_status === "active" ? "default" : "secondary"}>{member.membership_status}</Badge>} />
          <DetailRow label="Phone" value={member.profiles?.phone || "—"} />
          <DetailRow label="Gender" value={member.gender || "—"} />
          <DetailRow label="Date of Birth" value={member.date_of_birth || "—"} />
          <DetailRow label="Weight" value={member.weight_kg ? `${member.weight_kg} kg` : "—"} />
          <DetailRow label="Height" value={member.height_cm ? `${member.height_cm} cm` : "—"} />
          <DetailRow label="BMI" value={bmi || "—"} />
          <DetailRow label="Fitness Goal" value={member.fitness_goal || "—"} />
          <DetailRow label="Plan" value={plans?.find((p) => p.id === member.plan_id)?.name || "—"} />
          <DetailRow label="Trainer" value={trainerName} />
          <DetailRow label="Membership Start" value={member.membership_start || "—"} />
          <DetailRow label="Membership End" value={member.membership_end || "—"} />
          <DetailRow label="Emergency Contact" value={member.emergency_contact || "—"} />
          <DetailRow label="Emergency Phone" value={member.emergency_phone || "—"} />
          <DetailRow label="Medical Notes" value={member.medical_notes || "—"} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

export default Members;
