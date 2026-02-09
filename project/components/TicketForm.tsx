import React, { useState, useEffect } from 'react';
import { Ticket, Priority, User, Status, Category, Attachment, Workflow } from '../types';
import { RichTextEditor } from './RichTextEditor';

type SubmitAction = 'SUBMIT' | 'DRAFT';

interface TicketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (ticketData: Omit<Ticket, 'id' | 'ticketId' | 'createdAt' | 'updatedAt' | 'history' | 'requestor' | 'status' | 'comments' | 'currentStageIndex' | 'blocking'>, action: SubmitAction, editingTicketId?: number) => void;
  editingTicket?: Ticket | null;
  currentUser: User;
  users: User[];
  workflows: Workflow[];
  allTickets: Ticket[];
}

export const TicketForm: React.FC<TicketFormProps> = ({ isOpen, onClose, onSubmit, editingTicket, currentUser, users, workflows, allTickets }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.Medium);
  const [category, setCategory] = useState<Category>(Category.GeneralInquiry);
  const [assigneeId, setAssigneeId] = useState<number>(currentUser.id);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [workflowId, setWorkflowId] = useState<number | null>(workflows.length > 0 ? workflows[0].id : null);
  const [dependencies, setDependencies] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (editingTicket) {
      setTitle(editingTicket.title);
      setDescription(editingTicket.description);
      setPriority(editingTicket.priority);
      setCategory(editingTicket.category);
      setAssigneeId(editingTicket.assignee.id);
      setAttachments(editingTicket.attachments || []);
      setWorkflowId(editingTicket.workflowId);
      setDependencies(editingTicket.dependencies || []);
      setDueDate(editingTicket.dueDate ? editingTicket.dueDate.toISOString().split('T')[0] : '');
    } else {
      // Reset form
      setTitle('');
      setDescription('');
      setPriority(Priority.Medium);
      setCategory(Category.GeneralInquiry);
      setAssigneeId(currentUser.id);
      setAttachments([]);
      setWorkflowId(workflows.length > 0 ? workflows[0].id : null);
      setDependencies([]);
      setDueDate('');
    }
  }, [editingTicket, isOpen, currentUser.id, workflows]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
        const newFiles = Array.from<File>(e.target.files).map(file => ({
            name: file.name,
            size: file.size,
            type: file.type
        }));
        setAttachments(prev => [...prev, ...newFiles]);
    }
  };

  const handleDependencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIds = Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => parseInt(option.value));
    setDependencies(selectedIds);
  };

  const handleSubmit = (action: SubmitAction) => (e: React.FormEvent) => {
    e.preventDefault();
    const assignee = users.find(u => u.id === assigneeId);
    if (!title || !description || !assignee) return;
    if(action === 'SUBMIT' && !workflowId) {
        alert("Please select a workflow before submitting.");
        return;
    }
    
    onSubmit({ title, description, priority, category, assignee, attachments, workflowId, dependencies, dueDate: dueDate ? new Date(dueDate) : undefined }, action, editingTicket?.id);
  };

  if (!isOpen) return null;

  const availableTicketsForDependency = allTickets.filter(t => t.id !== editingTicket?.id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-full overflow-y-auto">
        <form className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{editingTicket ? 'Edit Ticket' : 'Create New Ticket'}</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">&times;</button>
          </div>
          <div className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
              <div className="mt-1">
                <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Provide a detailed description..."
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="workflow" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Approval Workflow</label>
                    <select
                        id="workflow"
                        value={workflowId ?? ''}
                        onChange={(e) => setWorkflowId(Number(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <select
                        id="category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as Category)}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                    <select
                        id="priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as Priority)}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        {Object.values(Priority).filter(p => p !== Priority.Critical).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Assignee</label>
                    <select
                        id="assignee"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(parseInt(e.target.value))}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</label>
                    <input
                        type="date"
                        id="dueDate"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                </div>
            </div>
             <div>
                <label htmlFor="dependencies" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dependencies</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Select tickets that must be completed before this one. (Hold Ctrl/Cmd to select multiple)</p>
                <select
                    id="dependencies"
                    multiple
                    value={dependencies.map(String)}
                    onChange={handleDependencyChange}
                    className="mt-1 block w-full h-24 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                    {availableTicketsForDependency.map(t => (
                        <option key={t.id} value={t.id}>{t.ticketId || `Draft #${t.id}`}: {t.title}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Attachments</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                         <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                <span>Upload files</span>
                                <input id="file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={handleFileChange}/>
                            </label>
                            <p className="pl-1">or drag and drop</p>
                        </div>
                    </div>
                </div>
                {attachments.length > 0 && (
                    <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <p>Selected files:</p>
                        <ul className="list-disc pl-5">
                            {attachments.map((file, i) => <li key={i}>{file.name}</li>)}
                        </ul>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                Cancel
              </button>
              <button type="button" onClick={handleSubmit('DRAFT')} className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800">
                Save as Draft
              </button>
              <button type="button" onClick={handleSubmit('SUBMIT')} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                {editingTicket ? 'Save Changes' : 'Submit Ticket'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};