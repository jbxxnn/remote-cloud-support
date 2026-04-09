"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { HeaderBar } from "@/components/layout/header-bar";
import { AssistantIcon } from "@/components/assistant/assistant-icon";
import { AssistantDrawer } from "@/components/assistant/assistant-drawer";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  Plus, 
  Search,
  Eye,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Building,
  Clock,
  Shield,
  Key,
  Loader,
  Check,
  UserPlus
} from "lucide-react";

interface Staff {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  clientId?: string;
  clientName?: string;
  assignedClients?: { id: string, name: string }[];
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
}

interface StaffManagementProps {
  user: any;
}

export function StaffManagement({ user }: StaffManagementProps) {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><Loader className="w-8 h-8 animate-spin" /></div>}>
      <StaffManagementContent user={user} />
    </Suspense>
  );
}

export function StaffManagementContent({ user }: StaffManagementProps) {
  const searchParams = useSearchParams();
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "staff",
    clientId: "",
    clientIds: [] as string[],
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchStaff();
    fetchClients();
    
    // Handle external triggers (e.g. from Client Management)
    const action = searchParams.get('action');
    const clientId = searchParams.get('clientId');
    
    if (action === 'add') {
      setShowAddDialog(true);
      if (clientId) {
        setFormData(prev => ({ 
          ...prev, 
          clientId,
          clientIds: [clientId],
          role: 'user' // Default to Tablet for client-triggered adds
        }));
      }
    }
  }, [searchParams]);

  const fetchStaff = async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        const nonAdmins = data.filter((u: any) => u.role !== "admin");
        setStaff(nonAdmins);
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients");
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingStaff && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!editingStaff && formData.password.length < 6) {
      alert("Password must be at least 6 characters long");
      return;
    }

    setSubmitting(true);

    try {
      const url = editingStaff ? `/api/users/${editingStaff.id}` : "/api/users";
      const method = editingStaff ? "PUT" : "POST";
      
      const requestBody = editingStaff ? {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        clientId: formData.clientId || null,
        clientIds: formData.clientIds,
        isActive: formData.isActive
      } : {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        clientId: formData.clientId || null,
        clientIds: formData.clientIds,
        isActive: formData.isActive
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const updatedStaff = await response.json();
        
        if (editingStaff) {
          setStaff(staff.map(staffMember => staffMember.id === editingStaff.id ? updatedStaff : staffMember));
          setShowEditDialog(false);
          setEditingStaff(null);
        } else {
          setStaff([updatedStaff, ...staff]);
          setShowAddDialog(false);
        }
        
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || `Failed to ${editingStaff ? 'update' : 'create'} staff member`);
      }
    } catch (error) {
      alert(`Failed to ${editingStaff ? 'update' : 'create'} staff member`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.checked,
    });
  };

  const toggleClientSelection = (clientId: string) => {
    setFormData(prev => {
      const clientIds = prev.clientIds.includes(clientId)
        ? prev.clientIds.filter(id => id !== clientId)
        : [...prev.clientIds, clientId];
      return { ...prev, clientIds };
    });
  };

  const handleSelectAllClients = () => {
    if (formData.clientIds.length === clients.length) {
      setFormData(prev => ({ ...prev, clientIds: [] }));
    } else {
      setFormData(prev => ({ ...prev, clientIds: clients.map(c => c.id) }));
    }
  };

  const handleEdit = (staffMember: Staff) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone || "",
      password: "",
      confirmPassword: "",
      role: staffMember.role,
      clientId: staffMember.clientId || "",
      clientIds: staffMember.assignedClients?.map(c => c.id) || (staffMember.clientId ? [staffMember.clientId] : []),
      isActive: staffMember.isActive
    });
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingStaff) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/users/${deletingStaff.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setStaff(staff.filter(staffMember => staffMember.id !== deletingStaff.id));
        setShowDeleteDialog(false);
        setDeletingStaff(null);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete staff member");
      }
    } catch (error) {
      alert("Failed to delete staff member");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "staff",
      clientId: "",
      clientIds: [],
      isActive: true
    });
  };

  const handleCancelEdit = () => {
    setShowEditDialog(false);
    setEditingStaff(null);
    resetForm();
  };

  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setDeletingStaff(null);
  };

  const filteredStaff = staff.filter(staffMember => 
    staffMember.role !== 'user' && (
      staffMember.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staffMember.assignedClients?.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header Bar */}
      <HeaderBar
        module="Staff Management"
        activeAlerts={0} // TODO: Get actual active alerts count
        staffOnline={0} // TODO: Get actual staff online count
        openSOPs={0} // TODO: Get actual open SOPs count
        onAssistantClick={() => setAssistantOpen(true)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="space-y-6 p-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search staff..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">
              {filteredStaff.length} of {staff.filter(s => s.role !== 'user').length} staff members
            </Badge>
            <Button onClick={() => setShowAddDialog(true)} className="rounded-full bg-[var(--rce-green)] text-primary-foreground hover:bg-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </div>

        {/* Staff Table */}
        {filteredStaff.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No staff members found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm ? "No staff members match your search criteria." : "Get started by adding your first staff member."}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddDialog(true)} className="rounded-full bg-[var(--rce-green)] text-primary-foreground hover:bg-primary">
                  <Plus className="w-4 h-4 mr-2" / >
                  Add First Staff Member
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-none rounded-md">
            {/* <CardHeader>
              <CardTitle>Staff Members</CardTitle>
              <CardDescription>
                Manage staff accounts for client support
              </CardDescription>
            </CardHeader> */}
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Status</TableHead>
                    {/* <TableHead>Role</TableHead> */}
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-primary" />
                          <div>
                            <div className="font-medium">{member.name}</div>
                            {/* <div className="text-sm text-muted-foreground">{member.email}</div> */}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span>{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {member.assignedClients && member.assignedClients.length > 0 ? (
                          member.assignedClients.length > 2 ? (
                            <Badge variant="secondary" className="w-fit cursor-default" title={member.assignedClients.map(c => c.name).join(', ')}>
                              {member.assignedClients.length} Clients Assigned
                            </Badge>
                          ) : (
                            member.assignedClients.map(c => (
                              <div key={c.id} className="flex items-center space-x-2">
                                <Building className="w-3 h-3 text-muted-foreground" />
                                <span className="text-sm">{c.name}</span>
                              </div>
                            ))
                          )
                        ) : member.clientName ? (
                          <div className="flex items-center space-x-2">
                            <Building className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm">{member.clientName}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No assignment</span>
                        )}
                      </div>
                    </TableCell>
                      <TableCell>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={member.role === "staff" ? "text-blue-600 border-blue-200" : "text-purple-600 border-purple-200"}>
                          {member.role === "staff" ? (
                            <Shield className="w-3 h-3 mr-1" />
                          ) : (
                            <Key className="w-3 h-3 mr-1" />
                          )}
                          {member.role === "staff" ? "Staff" : "Tablet"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <span>{new Date(member.createdAt).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* <Button variant="ghost" size="sm" title="View Staff">
                            <Eye className="w-4 h-4" />
                          </Button> */}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Edit Staff"
                            onClick={() => handleEdit(member)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Delete Staff"
                            onClick={() => {
                              setDeletingStaff(member);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Staff Member</DialogTitle>
            <DialogDescription>
              Create a new staff account for client support
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter staff member's full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="staff@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  placeholder="Confirm password"
                />
              </div>
            </div>

            {/* Assignment */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Assign Clients *</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={handleSelectAllClients}
                  >
                    {formData.clientIds.length === clients.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto space-y-2">
                  {clients.map(client => (
                    <div 
                      key={client.id} 
                      className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
                      onClick={() => toggleClientSelection(client.id)}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${formData.clientIds.includes(client.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                        {formData.clientIds.includes(client.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className="text-sm">{client.name}</span>
                    </div>
                  ))}
                  {clients.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">No clients available</span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  title="Active account"
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="isActive">Active account</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>
              Update staff member information
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter staff member's full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address *</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="staff@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <Input
                  id="edit-phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            {/* Assignment */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Assign Clients *</Label>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={handleSelectAllClients}
                  >
                    {formData.clientIds.length === clients.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="border rounded-md p-3 max-h-[150px] overflow-y-auto space-y-2">
                  {clients.map(client => (
                    <div 
                      key={client.id} 
                      className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-1.5 rounded transition-colors"
                      onClick={() => toggleClientSelection(client.id)}
                    >
                      <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${formData.clientIds.includes(client.id) ? 'bg-primary border-primary' : 'border-input'}`}>
                        {formData.clientIds.includes(client.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className="text-sm">{client.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  name="isActive"
                  title="Active account"
                  checked={formData.isActive}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="edit-isActive">Active account</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Staff Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Staff Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingStaff?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelDelete}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete Staff Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SupportSense Assistant Icon */}
      <AssistantIcon
        module="Staff Management"
        userRole="admin"
        drawerOpen={assistantOpen}
        onDrawerOpenChange={setAssistantOpen}
      />

      {/* SupportSense Assistant Drawer */}
      <AssistantDrawer
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
      />
      </div>
    </div>
  );
} 