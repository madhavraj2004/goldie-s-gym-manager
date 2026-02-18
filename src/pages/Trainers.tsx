import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useTrainers, useCreateTrainer, useUpdateTrainer, useDeleteTrainer, TrainerWithProfile } from "@/hooks/useTrainers";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus, Pencil, Trash2, Eye, Dumbbell, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Trainers = () => {
  const { role } = useAuth();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<TrainerWithProfile | null>(null);
  const [showDetail, setShowDetail] = useState<TrainerWithProfile | null>(null);
  const [showDelete, setShowDelete] = useState<TrainerWithProfile | null>(null);

  const { data: trainers, isLoading } = useTrainers(search);
  const createTrainer = useCreateTrainer();
  const updateTrainer = useUpdateTrainer();
  const deleteTrainer = useDeleteTrainer();

  const isAdmin = role === "admin";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="font-display text-3xl font-bold">Trainers</h1>
          {isAdmin && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Trainer
            </Button>
          )}
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or specialization..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading trainers...</div>
            ) : !trainers?.length ? (
              <div className="p-8 text-center text-muted-foreground">No trainers found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainer</TableHead>
                    <TableHead className="hidden md:table-cell">Specialization</TableHead>
                    <TableHead className="hidden lg:table-cell">Experience</TableHead>
                    <TableHead className="hidden lg:table-cell">Certifications</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {(t.profiles?.full_name || "?").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{t.profiles?.full_name || "—"}</span>
                            <p className="text-xs text-muted-foreground md:hidden">{t.specialization || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{t.specialization || "—"}</TableCell>
                      <TableCell className="hidden lg:table-cell">{t.experience_years ?? 0} yrs</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {t.certifications?.slice(0, 2).map((c, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                          ))}
                          {(t.certifications?.length || 0) > 2 && (
                            <Badge variant="secondary" className="text-xs">+{t.certifications!.length - 2}</Badge>
                          )}
                          {!t.certifications?.length && "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{t.assigned_members_count}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setShowDetail(t)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => setShowEdit(t)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setShowDelete(t)}>
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

      {/* Create */}
      <CreateTrainerDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={createTrainer.mutateAsync}
        isLoading={createTrainer.isPending}
      />

      {/* Edit */}
      {showEdit && (
        <EditTrainerDialog
          trainer={showEdit}
          onClose={() => setShowEdit(null)}
          onUpdate={updateTrainer.mutateAsync}
          isLoading={updateTrainer.isPending}
        />
      )}

      {/* Detail */}
      {showDetail && <TrainerDetailDialog trainer={showDetail} onClose={() => setShowDetail(null)} />}

      {/* Delete Confirmation */}
      {showDelete && (
        <Dialog open onOpenChange={() => setShowDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Trainer</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{showDelete.profiles?.full_name}</strong>? This will also remove their user account.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDelete(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteTrainer.isPending}
                onClick={async () => {
                  await deleteTrainer.mutateAsync(showDelete.user_id);
                  setShowDelete(null);
                }}
              >
                {deleteTrainer.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
};

/* ---- Create Trainer Dialog ---- */
function CreateTrainerDialog({
  open, onClose, onCreate, isLoading,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: any) => Promise<any>;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    email: "", password: "", full_name: "", phone: "",
    specialization: "", experience_years: "", bio: "", certifications: "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const certs = form.certifications
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    await onCreate({
      ...form,
      experience_years: form.experience_years ? Number(form.experience_years) : undefined,
      certifications: certs.length ? certs : undefined,
    });
    setForm({ email: "", password: "", full_name: "", phone: "", specialization: "", experience_years: "", bio: "", certifications: "" });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" /> Add New Trainer
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Specialization</Label>
              <Input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} placeholder="e.g. Strength Training" />
            </div>
            <div className="space-y-1">
              <Label>Experience (years)</Label>
              <Input type="number" value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} min="0" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Certifications (comma-separated)</Label>
            <Input value={form.certifications} onChange={(e) => set("certifications", e.target.value)} placeholder="e.g. ACE, NASM, CrossFit L1" />
          </div>

          <div className="space-y-1">
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={3} placeholder="Brief description about the trainer..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isLoading ? "Creating..." : "Create Trainer"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ---- Edit Trainer Dialog ---- */
function EditTrainerDialog({
  trainer, onClose, onUpdate, isLoading,
}: {
  trainer: TrainerWithProfile;
  onClose: () => void;
  onUpdate: (input: any) => Promise<any>;
  isLoading: boolean;
}) {
  const [form, setForm] = useState({
    specialization: trainer.specialization || "",
    experience_years: trainer.experience_years?.toString() || "",
    bio: trainer.bio || "",
    certifications: trainer.certifications?.join(", ") || "",
  });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const certs = form.certifications
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    await onUpdate({
      userId: trainer.user_id,
      specialization: form.specialization || null,
      experience_years: form.experience_years ? Number(form.experience_years) : null,
      bio: form.bio || null,
      certifications: certs.length ? certs : null,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trainer: {trainer.profiles?.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Specialization</Label>
              <Input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Experience (years)</Label>
              <Input type="number" value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} min="0" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Certifications (comma-separated)</Label>
            <Input value={form.certifications} onChange={(e) => set("certifications", e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Bio</Label>
            <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={3} />
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

/* ---- Trainer Detail Dialog ---- */
function TrainerDetailDialog({ trainer, onClose }: { trainer: TrainerWithProfile; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {(trainer.profiles?.full_name || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {trainer.profiles?.full_name || "Unknown"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Phone</span>
              <p className="font-medium">{trainer.profiles?.phone || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Experience</span>
              <p className="font-medium">{trainer.experience_years ?? 0} years</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Specialization</span>
              <p className="font-medium">{trainer.specialization || "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Certifications</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {trainer.certifications?.length ? (
                  trainer.certifications.map((c, i) => (
                    <Badge key={i} variant="secondary">{c}</Badge>
                  ))
                ) : (
                  <span className="font-medium">—</span>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Bio</span>
              <p className="font-medium">{trainer.bio || "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Assigned Members</span>
              <p className="font-medium">{trainer.assigned_members_count ?? 0}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Trainers;
