import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MapPin,
  Phone,
  Clock,
  DollarSign,
  HelpCircle,
  Tag,
  Edit2,
  X,
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  Send,
  Database,
  ArrowRight
} from 'lucide-react';
import { BusinessKnowledge, ServicePriceItem } from '../types';
import { api } from '../api/client';

interface BusinessKnowledgePageProps {
  knowledge: BusinessKnowledge | null;
  onUpdateKnowledge: (knowledge: BusinessKnowledge) => void;
}

const OFFICIAL_CATEGORIES = [
  'All',
  'Hair Cut',
  'Hair Spa',
  'Hair Straightening',
  'Hair Treatment',
  'Facial',
  'Waxing',
  'Threading',
  'D-Tan',
  'Nail Extension'
];

export const BusinessKnowledgePage: React.FC<BusinessKnowledgePageProps> = ({
  knowledge,
  onUpdateKnowledge
}) => {
  const [formData, setFormData] = useState<BusinessKnowledge>(
    knowledge || {
      id: 'bk_default',
      businessName: 'Dream Hair & Beauty Family Salon',
      businessDescription: '',
      location: 'Telephone Maidan, Katwa',
      phoneNumber: '6294748025',
      openingHours: 'Monday - Sunday: 10:00 AM - 9:00 PM',
      services: [],
      servicePrices: [],
      bookingInformation: '',
      paymentInformation: '',
      faqs: [],
      specialOffers: '',
      additionalInformation: '',
      updatedAt: new Date().toISOString()
    }
  );

  useEffect(() => {
    if (knowledge) {
      setFormData(knowledge);
    }
  }, [knowledge]);

  // Search & Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Service Form
  const [newService, setNewService] = useState({
    service: '',
    category: 'Hair Straightening',
    gender: 'All',
    brand: '',
    hairLength: '',
    price: '',
    description: '',
    aliases: ''
  });

  // Edit Service Modal
  const [editingService, setEditingService] = useState<ServicePriceItem | null>(null);
  const [editForm, setEditForm] = useState<{
    id?: string;
    service: string;
    brand: string;
    price: string;
    category: string;
    gender: string;
    hairLength: string;
    description: string;
    aliases: string;
    isEnabled: boolean;
  }>({
    service: '',
    brand: '',
    price: '',
    category: 'Hair Straightening',
    gender: 'All',
    hairLength: '',
    description: '',
    aliases: '',
    isEnabled: true
  });

  // Action status
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [isUpdatingService, setIsUpdatingService] = useState(false);
  const [serviceFeedback, setServiceFeedback] = useState<string | null>(null);

  // Live AI Verification tester
  const [testQuery, setTestQuery] = useState('Ladies Strex price koto?');
  const [testChannel, setTestChannel] = useState<'instagram' | 'whatsapp'>('whatsapp');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Handle start editing service
  const handleStartEdit = (sp: ServicePriceItem) => {
    setEditingService(sp);
    setEditForm({
      id: sp.id,
      service: sp.service,
      brand: sp.brand || '',
      price: sp.price,
      category: sp.category || 'Hair Straightening',
      gender: sp.gender || 'All',
      hairLength: sp.hairLength || '',
      description: sp.description || '',
      aliases: (sp.aliases || []).join(', '),
      isEnabled: sp.isEnabled !== false
    });
  };

  // Save edited service to live database (Requirement 1, 2, 3, 4)
  const handleSaveServiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setIsUpdatingService(true);
    setServiceFeedback(null);
    try {
      const aliasArray = editForm.aliases.split(',').map(s => s.trim()).filter(Boolean);
      const updatePayload = {
        service: editForm.service.trim(),
        brand: editForm.brand.trim() || undefined,
        price: editForm.price.trim(),
        category: editForm.category.trim() || 'Hair Straightening',
        gender: editForm.gender.trim() || undefined,
        hairLength: editForm.hairLength.trim() || undefined,
        description: editForm.description.trim() || undefined,
        aliases: aliasArray,
        isEnabled: editForm.isEnabled
      };

      let updatedKnowledge: BusinessKnowledge;
      if (editingService.id) {
        const res = await api.updateService(editingService.id, updatePayload);
        updatedKnowledge = res.knowledge;
      } else {
        const updatedPrices = (formData.servicePrices || []).map(p =>
          p === editingService ? { ...p, ...updatePayload } : p
        );
        const res = await api.updateBusinessKnowledge({ ...formData, servicePrices: updatedPrices });
        updatedKnowledge = res.knowledge;
      }

      setFormData(updatedKnowledge);
      onUpdateKnowledge(updatedKnowledge);
      setEditingService(null);
      setServiceFeedback(`Database updated successfully: "${updatePayload.service}" is now ${updatePayload.price}. Next AI request uses this new price with zero redeployment.`);
      setTimeout(() => setServiceFeedback(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to update service in database');
    } finally {
      setIsUpdatingService(false);
    }
  };

  // Toggle service enabled/disabled (Disabled items are excluded from AI knowledge)
  const handleToggleService = async (sp: ServicePriceItem) => {
    if (!sp.id) return;
    try {
      const res = await api.toggleService(sp.id);
      setFormData(res.knowledge);
      onUpdateKnowledge(res.knowledge);
      setServiceFeedback(`Service "${sp.service}" is now ${res.service.isEnabled ? 'ENABLED' : 'DISABLED'}. AI will ${res.service.isEnabled ? 'include' : 'ignore'} it.`);
      setTimeout(() => setServiceFeedback(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle service status');
    }
  };

  // Delete service record
  const handleDeleteService = async (id?: string, name?: string) => {
    if (!id) return;
    if (!confirm(`Are you sure you want to delete "${name || 'this service'}" from the database?`)) return;

    try {
      const res = await api.deleteService(id);
      setFormData(res.knowledge);
      onUpdateKnowledge(res.knowledge);
      setServiceFeedback(`Service "${name}" was permanently removed from Business Knowledge.`);
      setTimeout(() => setServiceFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete service');
    }
  };

  // Add new service
  const handleAddNewService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.service.trim() || !newService.price.trim()) {
      alert('Service name and price are required');
      return;
    }

    try {
      const aliasArray = newService.aliases.split(',').map(s => s.trim()).filter(Boolean);
      const res = await api.addService({
        service: newService.service.trim(),
        price: newService.price.trim(),
        category: newService.category.trim() || 'Hair Straightening',
        brand: newService.brand.trim() || undefined,
        gender: newService.gender.trim() || 'All',
        hairLength: newService.hairLength.trim() || undefined,
        description: newService.description.trim() || undefined,
        aliases: aliasArray,
        isEnabled: true
      });

      setFormData(res.knowledge);
      onUpdateKnowledge(res.knowledge);
      setNewService({
        service: '',
        category: 'Hair Straightening',
        gender: 'All',
        brand: '',
        hairLength: '',
        price: '',
        description: '',
        aliases: ''
      });
      setServiceFeedback(`New service "${newService.service}" added to live database.`);
      setTimeout(() => setServiceFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to add service');
    }
  };

  // Save General Salon Info
  const handleSaveGeneralKnowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    try {
      const res = await api.updateBusinessKnowledge(formData);
      onUpdateKnowledge(res.knowledge);
      setServiceFeedback('Salon information saved successfully!');
      setTimeout(() => setServiceFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save general knowledge');
    } finally {
      setIsSavingGeneral(false);
    }
  };

  // Live AI verification test
  const handleTestAiQuery = async () => {
    if (!testQuery.trim()) return;
    setTestLoading(true);
    setTestResponse(null);
    try {
      let res: any;
      if (testChannel === 'whatsapp') {
        res = await api.simulateWhatsAppMessage({
          phoneNumber: '919876543210',
          customerName: 'Salon Guest',
          messageText: testQuery.trim()
        });
      } else {
        res = await api.simulateMessage({
          username: 'salon_guest',
          customerName: 'Salon Guest',
          messageText: testQuery.trim()
        });
      }
      setTestResponse(res.outboundMessage?.messageText || res.aiResult?.replyText || 'No reply generated');
    } catch (err: any) {
      setTestResponse(`Error: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // Filtered services
  const filteredServices = (formData.servicePrices || []).filter(sp => {
    const matchesCategory =
      selectedCategory === 'All' ||
      (sp.category && sp.category.toLowerCase() === selectedCategory.toLowerCase());

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      sp.service.toLowerCase().includes(q) ||
      (sp.brand && sp.brand.toLowerCase().includes(q)) ||
      (sp.description && sp.description.toLowerCase().includes(q)) ||
      (sp.aliases && sp.aliases.some(a => a.toLowerCase().includes(q)));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/20 rounded-xl backdrop-blur-xs text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold">Dream Family Salon Business Knowledge</h1>
          </div>
          <p className="text-slate-300 text-xs sm:text-sm max-w-2xl">
            The saved Business Knowledge database is the <strong>Single Source of Truth</strong> for both Instagram and WhatsApp. Gemini dynamically reads these prices in real time with zero hardcoded values.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>{formData.servicePrices?.length || 0} Live Database Services</span>
          </span>
        </div>
      </div>

      {serviceFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{serviceFeedback}</span>
        </div>
      )}

      {/* Services & Pricing Management Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Official Salon Services & Pricing Database</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit any price, category, name, or gender. Changes immediately invalidate cache and quote to customers.
            </p>
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong>{filteredServices.length}</strong> of {formData.servicePrices?.length || 0} services
          </div>
        </div>

        {/* Search Bar & Category Pills */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by service name, brand, or alias (e.g. Strex, Smoothing, Facial, Keratin)..."
              className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50/50"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {OFFICIAL_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Services List Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white max-h-[32rem] overflow-y-auto">
          {filteredServices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No services match the current category or search query.
            </div>
          ) : (
            filteredServices.map((sp, idx) => {
              const isEnabled = sp.isEnabled !== false;

              return (
                <div
                  key={sp.id || idx}
                  className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition ${
                    isEnabled ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/60 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-slate-900 ${!isEnabled ? 'line-through text-slate-400' : ''}`}>
                        {sp.service}
                      </span>

                      {sp.category && (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                          {sp.category}
                        </span>
                      )}

                      {sp.brand && (
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
                          {sp.brand}
                        </span>
                      )}

                      {sp.gender && sp.gender !== 'All' && (
                        <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-medium px-1.5 py-0.5 rounded-md">
                          {sp.gender}
                        </span>
                      )}

                      {!isEnabled && (
                        <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                          Disabled (Excluded from AI)
                        </span>
                      )}
                    </div>

                    {(sp.description || (sp.aliases && sp.aliases.length > 0)) && (
                      <p className="text-slate-500 text-[11px] mt-1 truncate">
                        {sp.description && <span>{sp.description}</span>}
                        {sp.aliases && sp.aliases.length > 0 && (
                          <span className="text-slate-400 ml-1">
                            • Aliases: {sp.aliases.join(', ')}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Actions & Price */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span className={`font-bold text-sm px-2.5 py-1 rounded-lg border ${
                      isEnabled
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 font-mono'
                        : 'text-slate-400 bg-slate-100 border-slate-200 line-through'
                    }`}>
                      {sp.price}
                    </span>

                    {/* Enable/Disable Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleService(sp)}
                      className={`p-1.5 rounded-lg border transition ${
                        isEnabled
                          ? 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                          : 'text-slate-400 bg-slate-100 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={isEnabled ? 'Disable service (AI will ignore)' : 'Enable service (AI will quote)'}
                    >
                      {isEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(sp)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-slate-200"
                      title="Edit Service"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteService(sp.id, sp.service)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Delete Service"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add New Service Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-indigo-600" />
            <span>Add New Service to Live Database</span>
          </div>

          <form onSubmit={handleAddNewService} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={newService.service}
                  onChange={e => setNewService(prev => ({ ...prev, service: e.target.value }))}
                  placeholder="e.g. Strex Hair Straightening"
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Price *</label>
                <input
                  type="text"
                  required
                  value={newService.price}
                  onChange={e => setNewService(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="e.g. ₹2199"
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-emerald-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Official Category</label>
                <select
                  value={newService.category}
                  onChange={e => setNewService(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {OFFICIAL_CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gender Applicability</label>
                <select
                  value={newService.gender}
                  onChange={e => setNewService(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl"
                >
                  <option value="All">All</option>
                  <option value="Gents">Gents</option>
                  <option value="Ladies">Ladies</option>
                  <option value="Ladies Any Length">Ladies Any Length</option>
                  <option value="Kids">Kids</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Brand (Optional)</label>
                <input
                  type="text"
                  value={newService.brand}
                  onChange={e => setNewService(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="e.g. Strex, Loreal, Wella"
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Aliases (comma-separated)</label>
                <input
                  type="text"
                  value={newService.aliases}
                  onChange={e => setNewService(prev => ({ ...prev, aliases: e.target.value }))}
                  placeholder="e.g. Hair Smoothing, Smoothing"
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description / Notes</label>
              <input
                type="text"
                value={newService.description}
                onChange={e => setNewService(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. Hair Wash + Blow Dry — FREE with Ladies Hair Cut"
                className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service to Database</span>
            </button>
          </form>
        </div>
      </div>

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Edit Service & Price</h4>
                  <p className="text-[11px] text-slate-500">Live Database Update (Single Source of Truth)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveServiceEdit} className="p-6 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Service Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.service}
                    onChange={e => setEditForm(prev => ({ ...prev, service: e.target.value }))}
                    className="w-full p-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Strex Hair Straightening"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Price <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editForm.price}
                      onChange={e => setEditForm(prev => ({ ...prev, price: e.target.value }))}
                      className="w-full p-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl font-bold text-emerald-700 bg-emerald-50/50 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                      placeholder="e.g. ₹2199"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Official Category
                    </label>
                    <select
                      value={editForm.category}
                      onChange={e => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full p-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {OFFICIAL_CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                    <select
                      value={editForm.gender}
                      onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
                    >
                      <option value="All">All</option>
                      <option value="Gents">Gents</option>
                      <option value="Ladies">Ladies</option>
                      <option value="Ladies Any Length">Ladies Any Length</option>
                      <option value="Kids">Kids</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                    <input
                      type="text"
                      value={editForm.brand}
                      onChange={e => setEditForm(prev => ({ ...prev, brand: e.target.value }))}
                      className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
                      placeholder="e.g. Strex, Loreal, Wella"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Aliases (Comma-separated for AI matching)
                  </label>
                  <input
                    type="text"
                    value={editForm.aliases}
                    onChange={e => setEditForm(prev => ({ ...prev, aliases: e.target.value }))}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
                    placeholder="e.g. Hair Smoothing, Smoothing, Smoothening"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    When customers say any of these aliases, Gemini maps to this service.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
                    placeholder="e.g. Hair Wash + Blow Dry — FREE with Ladies Hair Cut"
                  />
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-800">Enable in AI Knowledge</div>
                  <input
                    type="checkbox"
                    checked={editForm.isEnabled}
                    onChange={e => setEditForm(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingService}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>{isUpdatingService ? 'Saving...' : 'Save to Database'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live AI Price Verification Tester */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Live AI Price & Knowledge Verification</h3>
          </div>
          <span className="text-[11px] text-slate-500">Real-time Gemini verification</span>
        </div>

        <p className="text-xs text-slate-500">
          Verify that when you update or save a price above, the AI quotes the exact new price without redeploying.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <div className="sm:col-span-1">
            <select
              value={testChannel}
              onChange={e => setTestChannel(e.target.value as any)}
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
            >
              <option value="whatsapp">Channel: WhatsApp</option>
              <option value="instagram">Channel: Instagram</option>
            </select>
          </div>

          <div className="sm:col-span-3 flex gap-2">
            <input
              type="text"
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              placeholder="e.g. Strex price? / Ladies Hair Cut koto? / Loreal Hair Spa?"
              className="flex-1 p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleTestAiQuery}
              disabled={testLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{testLoading ? 'Checking...' : 'Verify Quote'}</span>
            </button>
          </div>
        </div>

        {testResponse && (
          <div className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-bold">
              Gemini AI Direct Output ({testChannel}):
            </div>
            <div className="text-slate-100 text-xs leading-relaxed">{testResponse}</div>
          </div>
        )}
      </div>

      {/* Salon Info Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Salon Details & Operational Info</h3>
        </div>

        <form onSubmit={handleSaveGeneralKnowledge} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name:</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={e => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone:</label>
              <input
                type="text"
                value={formData.phoneNumber}
                onChange={e => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location Address:</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Hours:</label>
              <input
                type="text"
                value={formData.openingHours}
                onChange={e => setFormData(prev => ({ ...prev, openingHours: e.target.value }))}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Special Offers & Promotions:</label>
            <input
              type="text"
              value={formData.specialOffers}
              onChange={e => setFormData(prev => ({ ...prev, specialOffers: e.target.value }))}
              placeholder="e.g. Shob facial-er sathe D-Tan completely FREE!"
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingGeneral}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingGeneral ? 'Saving...' : 'Save Salon Information'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
