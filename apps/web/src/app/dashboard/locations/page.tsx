'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient, formatApiError } from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Location {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  timezone: string;
  taxRate: number;
  isDefault: boolean;
  isActive: boolean;
  stripeLocationId: string | null;
  _count: { orders: number; devices: number; employees: number };
}

interface LocationFormData {
  name: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  taxRatePercent: string;
}

const DEFAULT_FORM: LocationFormData = {
  name: '', email: '', phone: '', addressLine1: '', addressLine2: '',
  city: '', state: '', postalCode: '', country: 'US', timezone: 'America/New_York', taxRatePercent: '0',
};

function LocationForm({
  initial,
  onSave,
  onCancel,
  loading,
}: {
  initial?: Partial<LocationFormData>;
  onSave: (data: LocationFormData) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [form, setForm] = useState<LocationFormData>({ ...DEFAULT_FORM, ...initial });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Location name is required'); return; }
    onSave(form);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700">Location Name *</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Downtown, Main Street..."
          className="mt-1"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Email</label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="location@yourbiz.com"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Phone</label>
          <Input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+1 (555) 000-0000"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Street Address</label>
        <Input
          value={form.addressLine1}
          onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
          placeholder="123 Main Street"
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2">
          <label className="text-sm font-medium text-gray-700">City</label>
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            placeholder="San Francisco"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">State</label>
          <Input
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })}
            placeholder="CA"
            maxLength={2}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-gray-700">ZIP Code</label>
          <Input
            value={form.postalCode}
            onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            placeholder="94102"
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Tax Rate (%)</label>
          <Input
            type="number"
            min="0"
            max="30"
            step="0.01"
            value={form.taxRatePercent}
            onChange={(e) => setForm({ ...form, taxRatePercent: e.target.value })}
            placeholder="8.5"
            className="mt-1"
          />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" className="flex-1" loading={loading}>Save Location</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

function LocationCard({
  location,
  onSetDefault,
  onEdit,
  onDelete,
}: {
  location: Location;
  onSetDefault: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <Card className={cn('p-5', !location.isActive && 'opacity-60')}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{location.name}</h3>
            {location.isDefault && (
              <Badge className="bg-primary/10 text-primary text-xs">Default</Badge>
            )}
            {!location.isActive && (
              <Badge className="bg-gray-100 text-gray-500 text-xs">Inactive</Badge>
            )}
          </div>
          {(location.addressLine1 || location.city) && (
            <p className="text-sm text-gray-500 mt-0.5">
              {[location.addressLine1, location.city, location.state, location.postalCode]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {location.stripeLocationId && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ⚡ Terminal
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 mb-3">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{location._count.orders}</div>
          <div className="text-xs text-gray-500">Orders</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{location._count.devices}</div>
          <div className="text-xs text-gray-500">Devices</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">
            {(Number(location.taxRate) * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500">Tax Rate</div>
        </div>
      </div>

      {confirmDelete ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-600">Delete this location?</span>
          <Button size="sm" variant="destructive" onClick={onDelete}>Delete</Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
          {!location.isDefault && (
            <Button variant="outline" size="sm" onClick={onSetDefault}>Set Default</Button>
          )}
          {!location.isDefault && location._count.orders === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 ml-auto"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export default function LocationsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);

  const { data: locations, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiClient.get<Location[]>('/locations'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => apiClient.post('/locations', data),
    onSuccess: () => {
      toast.success('Location created!');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setShowForm(false);
    },
    onError: (err) => toast.error(formatApiError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      apiClient.put(`/locations/${id}`, data),
    onSuccess: () => {
      toast.success('Location updated!');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setEditLocation(null);
    },
    onError: (err) => toast.error(formatApiError(err)),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => apiClient.put(`/locations/${id}/default`, {}),
    onSuccess: () => {
      toast.success('Default location updated');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (err) => toast.error(formatApiError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/locations/${id}`),
    onSuccess: () => {
      toast.success('Location deleted');
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (err) => toast.error(formatApiError(err)),
  });

  function handleCreate(formData: LocationFormData) {
    createMutation.mutate({
      ...formData,
      taxRatePercent: formData.taxRatePercent ? parseFloat(formData.taxRatePercent) : 0,
    });
  }

  function handleUpdate(formData: LocationFormData) {
    if (!editLocation) return;
    updateMutation.mutate({
      id: editLocation.id,
      data: {
        ...formData,
        taxRatePercent: formData.taxRatePercent ? parseFloat(formData.taxRatePercent) : 0,
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-48 bg-gray-200 rounded-xl" />
          <div className="h-48 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Locations</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your store locations</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditLocation(null); }}>
          + Add Location
        </Button>
      </div>

      {(showForm && !editLocation) && (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">New Location</h2>
          <LocationForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            loading={createMutation.isPending}
          />
        </Card>
      )}

      {editLocation && (
        <Card className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Edit: {editLocation.name}</h2>
          <LocationForm
            initial={{
              name: editLocation.name,
              email: editLocation.email || '',
              phone: editLocation.phone || '',
              addressLine1: editLocation.addressLine1 || '',
              city: editLocation.city || '',
              state: editLocation.state || '',
              postalCode: editLocation.postalCode || '',
              country: editLocation.country,
              timezone: editLocation.timezone,
              taxRatePercent: String(Number(editLocation.taxRate) * 100),
            }}
            onSave={handleUpdate}
            onCancel={() => setEditLocation(null)}
            loading={updateMutation.isPending}
          />
        </Card>
      )}

      {!locations || locations.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="text-4xl mb-4">📍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Locations Yet</h2>
          <p className="text-gray-500 mb-6">Add your first location to start organizing your business.</p>
          <Button onClick={() => setShowForm(true)}>Add First Location</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              onSetDefault={() => setDefaultMutation.mutate(location.id)}
              onEdit={() => { setEditLocation(location); setShowForm(false); }}
              onDelete={() => deleteMutation.mutate(location.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
