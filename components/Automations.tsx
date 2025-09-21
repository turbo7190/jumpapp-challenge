"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Zap, Save, X } from "lucide-react";
import toast from "react-hot-toast";

interface Automation {
  id: string;
  name: string;
  type: string;
  platform: string;
  description: string;
  example?: string;
  isActive: boolean;
}

export default function Automations() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<Automation | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    type: "generate_post",
    platform: "linkedin",
    description: "",
    example: "",
  });

  const fetchAutomations = async () => {
    try {
      const response = await fetch("/api/automations");
      const data = await response.json();
      setAutomations(data || []);
    } catch (error) {
      console.error("Error fetching automations:", error);
      toast.error("Failed to fetch automations");
    } finally {
      setLoading(false);
    }
  };

  const saveAutomation = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingAutomation
        ? `/api/automations/${editingAutomation.id}`
        : "/api/automations";

      const method = editingAutomation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingAutomation ? "Automation updated" : "Automation created"
        );
        setShowModal(false);
        setEditingAutomation(null);
        resetForm();
        fetchAutomations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save automation");
      }
    } catch (error) {
      console.error("Error saving automation:", error);
      toast.error("Failed to save automation");
    }
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this automation?")) return;

    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Automation deleted");
        fetchAutomations();
      } else {
        toast.error("Failed to delete automation");
      }
    } catch (error) {
      console.error("Error deleting automation:", error);
      toast.error("Failed to delete automation");
    }
  };

  const toggleAutomation = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/automations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        toast.success(isActive ? "Automation enabled" : "Automation disabled");
        fetchAutomations();
      } else {
        toast.error("Failed to update automation");
      }
    } catch (error) {
      console.error("Error toggling automation:", error);
      toast.error("Failed to update automation");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "generate_post",
      platform: "linkedin",
      description: "",
      example: "",
    });
  };

  const openEditModal = (automation: Automation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      type: automation.type,
      platform: automation.platform,
      description: automation.description,
      example: automation.example || "",
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingAutomation(null);
    resetForm();
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAutomation(null);
    resetForm();
  };

  useEffect(() => {
    fetchAutomations();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Automations</h2>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Automation
        </button>
      </div>

      {automations.length === 0 ? (
        <div className="text-center py-12">
          <Zap className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No automations
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create automations to automatically generate social media content
            from your meetings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {automations.map((automation) => (
            <div key={automation.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {automation.name}
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditModal(automation)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteAutomation(automation.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {automation.type.replace("_", " ")}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {automation.platform}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {automation.description}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    toggleAutomation(automation.id, !automation.isActive)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    automation.isActive ? "bg-primary-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      automation.isActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-500">
                  {automation.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingAutomation ? "Edit Automation" : "Create Automation"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={saveAutomation} className="space-y-4 text-black">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 text-black px-2 py-1 border block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                  className="mt-1 block w-full text-black px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="generate_post">Generate Post</option>
                  <option value="generate_email">Generate Email</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Platform
                </label>
                <select
                  value={formData.platform}
                  onChange={(e) =>
                    setFormData({ ...formData, platform: e.target.value })
                  }
                  className="mt-1 block w-full text-black px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="linkedin">LinkedIn</option>
                  <option value="facebook">Facebook</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="mt-1 block w-full text-black px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe how the AI should generate content..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Example (Optional)
                </label>
                <textarea
                  value={formData.example}
                  onChange={(e) =>
                    setFormData({ ...formData, example: e.target.value })
                  }
                  rows={3}
                  className="mt-1 block text-black px-2 py-1 border w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Provide an example of the desired output..."
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {editingAutomation ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
