import React, { useState, useEffect } from 'react';
import { User, Role, Workflow, WorkflowStage, AssignmentRule, Category, PrioritizationRule, Priority, EscalationRule, Status } from '../types';
import { PlusIcon } from './icons';

interface AdminPanelProps {
    users: User[];
    workflows: Workflow[];
    assignmentRules: AssignmentRule[];
    prioritizationRules: PrioritizationRule[];
    escalationRules: EscalationRule[];
    onAddUser: (user: Omit<User, 'id'>) => void;
    onUpdateUser: (user: User) => void;
    onDeleteUser: (userId: number) => void;
    onUpdateWorkflows: (workflows: Workflow[]) => void;
    onUpdateAssignmentRules: (rules: AssignmentRule[]) => void;
    onUpdatePrioritizationRules: (rules: PrioritizationRule[]) => void;
    onUpdateEscalationRules: (rules: EscalationRule[]) => void;
}

// --- Modals and Components for Automation Rules ---
const AssignmentRuleModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rule: Omit<AssignmentRule, 'id'> | AssignmentRule) => void;
    ruleToEdit?: AssignmentRule | null;
}> = ({ isOpen, onClose, onSubmit, ruleToEdit }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState<Category>(Category.GeneralInquiry);
    const [role, setRole] = useState<Role>(Role.Engineer);

    useEffect(() => {
        if (ruleToEdit) {
            setName(ruleToEdit.name);
            setCategory(ruleToEdit.category);
            setRole(ruleToEdit.role);
        } else {
            setName('');
            setCategory(Category.GeneralInquiry);
            setRole(Role.Engineer);
        }
    }, [ruleToEdit, isOpen]);
    
    if(!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({ ...ruleToEdit, name, category, role, method: 'ROUND_ROBIN' });
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit} className="p-6">
                    <h2 className="text-xl font-bold mb-4">{ruleToEdit ? 'Edit Assignment Rule' : 'New Assignment Rule'}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Rule Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-50 dark:bg-gray-700"/>
                        </div>
                        <p>IF ticket category is:</p>
                        <select value={category} onChange={e => setCategory(e.target.value as Category)} className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-50 dark:bg-gray-700">
                                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <p>THEN assign to role:</p>
                        <select value={role} onChange={e => setRole(e.target.value as Role)} className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-50 dark:bg-gray-700">
                            {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <p className="text-sm text-gray-500">Assignment Method: Round Robin (default)</p>
                    </div>
                     <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Rule</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ... Other modals for Prioritization and Escalation will be similar ...


const UserFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (user: any) => void;
    userToEdit?: User | null;
}> = ({ isOpen, onClose, onSubmit, userToEdit }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<Role>(Role.Engineer);

    useEffect(() => {
        if (userToEdit) {
            setName(userToEdit.name);
            setEmail(userToEdit.email);
            setRole(userToEdit.role);
        } else {
            setName('');
            setEmail('');
            setRole(Role.Engineer);
        }
    }, [userToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userData = {
            ...userToEdit,
            name,
            email,
            role,
            password: userToEdit?.password || 'password',
            preferences: userToEdit?.preferences || { onStatusChange: true, onNewComment: true, onAssignment: true },
        };
        onSubmit(userData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <form onSubmit={handleSubmit} className="p-6">
                    <h2 className="text-xl font-bold mb-4">{userToEdit ? 'Edit User' : 'Add New User'}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Email</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Role</label>
                            <select value={role} onChange={e => setRole(e.target.value as Role)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700">
                                {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">{userToEdit ? 'Save' : 'Add'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const WorkflowFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (workflow: Omit<Workflow, 'id'> | Workflow) => void;
    workflowToEdit?: Workflow | null;
}> = ({ isOpen, onClose, onSubmit, workflowToEdit }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [stages, setStages] = useState<Omit<WorkflowStage, 'id'>[]>([]);

    useEffect(() => {
        if (workflowToEdit) {
            setName(workflowToEdit.name);
            setDescription(workflowToEdit.description);
            setStages(workflowToEdit.stages);
        } else {
            setName('');
            setDescription('');
            setStages([{ name: '', approverRole: Role.Manager }]);
        }
    }, [workflowToEdit, isOpen]);

    if (!isOpen) return null;

    const handleStageChange = (index: number, field: 'name' | 'approverRole', value: string) => {
        const newStages = [...stages];
        newStages[index] = { ...newStages[index], [field]: value };
        setStages(newStages);
    };

    const addStage = () => {
        setStages([...stages, { name: '', approverRole: Role.Manager }]);
    };

    const removeStage = (index: number) => {
        setStages(stages.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalStages = stages.map((s, i) => ({ ...s, id: i + 1 }));
        onSubmit({ ...workflowToEdit, name, description, stages: finalStages });
    };

    return (
         <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-full overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6">
                    <h2 className="text-xl font-bold mb-4">{workflowToEdit ? 'Edit Workflow' : 'Create New Workflow'}</h2>
                    <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium">Workflow Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700"/>
                        </div>
                        <div>
                            <h3 className="text-md font-medium mb-2">Approval Stages</h3>
                            {stages.map((stage, index) => (
                                <div key={index} className="flex items-center gap-2 p-2 border dark:border-gray-700 rounded-md mb-2">
                                    <span className="font-bold text-gray-500">{index + 1}</span>
                                    <input type="text" placeholder="Stage Name" value={stage.name} onChange={e => handleStageChange(index, 'name', e.target.value)} required className="flex-grow rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-50 dark:bg-gray-700"/>
                                    <select value={stage.approverRole} onChange={e => handleStageChange(index, 'approverRole', e.target.value)} className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-gray-50 dark:bg-gray-700">
                                        {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <button type="button" onClick={() => removeStage(index)} className="text-red-500 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900">&times;</button>
                                </div>
                            ))}
                            <button type="button" onClick={addStage} className="text-sm text-blue-600 hover:underline mt-2">Add Stage</button>
                        </div>
                    </div>
                     <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">{workflowToEdit ? 'Save Changes' : 'Create Workflow'}</button>
                    </div>
                </form>
            </div>
        </div>
    )
};


export const AdminPanel: React.FC<AdminPanelProps> = ({ users, workflows, assignmentRules, prioritizationRules, escalationRules, onAddUser, onUpdateUser, onDeleteUser, onUpdateWorkflows, onUpdateAssignmentRules, onUpdatePrioritizationRules, onUpdateEscalationRules }) => {
    const [isUserModalOpen, setUserModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [isWorkflowModalOpen, setWorkflowModalOpen] = useState(false);
    const [workflowToEdit, setWorkflowToEdit] = useState<Workflow | null>(null);
    const [isAssignmentRuleModalOpen, setAssignmentRuleModalOpen] = useState(false);
    const [assignmentRuleToEdit, setAssignmentRuleToEdit] = useState<AssignmentRule | null>(null);

    const handleOpenUserModal = (user: User | null = null) => {
        setUserToEdit(user);
        setUserModalOpen(true);
    };

    const handleOpenWorkflowModal = (workflow: Workflow | null = null) => {
        setWorkflowToEdit(workflow);
        setWorkflowModalOpen(true);
    };
    
    const handleOpenAssignmentRuleModal = (rule: AssignmentRule | null = null) => {
        setAssignmentRuleToEdit(rule);
        setAssignmentRuleModalOpen(true);
    };

    const handleUserSubmit = (userData: any) => {
        if(userData.id) {
            onUpdateUser(userData);
        } else {
            onAddUser(userData);
        }
        setUserModalOpen(false);
    }

    const handleWorkflowSubmit = (workflowData: Omit<Workflow, 'id'> | Workflow) => {
        let updatedWorkflows: Workflow[];
        if ('id' in workflowData) {
            updatedWorkflows = workflows.map(w => w.id === workflowData.id ? workflowData : w);
        } else {
            const newWorkflow = { ...workflowData, id: Math.max(0, ...workflows.map(w => w.id)) + 1 };
            updatedWorkflows = [...workflows, newWorkflow];
        }
        onUpdateWorkflows(updatedWorkflows);
        setWorkflowModalOpen(false);
    };
    
    const deleteWorkflow = (id: number) => {
        if(confirm('Are you sure you want to delete this workflow? This could affect existing tickets.')) {
            onUpdateWorkflows(workflows.filter(w => w.id !== id));
        }
    };
    
    const handleAssignmentRuleSubmit = (ruleData: Omit<AssignmentRule, 'id'> | AssignmentRule) => {
        let updatedRules: AssignmentRule[];
        if ('id' in ruleData) {
            updatedRules = assignmentRules.map(r => r.id === ruleData.id ? ruleData : r);
        } else {
            const newRule = { ...ruleData, id: Math.max(0, ...assignmentRules.map(r => r.id)) + 1 };
            updatedRules = [...assignmentRules, newRule];
        }
        onUpdateAssignmentRules(updatedRules);
        setAssignmentRuleModalOpen(false);
    };
    
    const deleteAssignmentRule = (id: number) => {
        onUpdateAssignmentRules(assignmentRules.filter(r => r.id !== id));
    };

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <button onClick={() => handleOpenUserModal()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        <PlusIcon className="h-5 w-5" /> Add User
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Role</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {users.filter(u => u.id !== 0).map(user => ( // Filter out SYSTEM_USER
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleOpenUserModal(user)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                        <button onClick={() => onDeleteUser(user.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflow Management</h1>
                    <button onClick={() => handleOpenWorkflowModal()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        <PlusIcon className="h-5 w-5" /> Create Workflow
                    </button>
                </div>
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase">Stages</th>
                                <th className="px-6 py-3 text-right text-xs font-medium uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {workflows.map(w => (
                                <tr key={w.id}>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">{w.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{w.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{w.stages.map(s => s.name).join(' → ')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => handleOpenWorkflowModal(w)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                        <button onClick={() => deleteWorkflow(w.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Automation Rules</h1>
                
                {/* Assignment Rules */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Assignment Rules</h2>
                        <button onClick={() => handleOpenAssignmentRuleModal()} className="flex items-center gap-2 px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                           <PlusIcon className="h-4 w-4" /> Add Rule
                        </button>
                    </div>
                     <div className="overflow-x-auto border dark:border-gray-700 rounded-md">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Name</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Condition</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase">Action</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium uppercase"></th>
                                </tr>
                            </thead>
                             <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {assignmentRules.map(r => (
                                    <tr key={r.id}>
                                        <td className="px-4 py-2 whitespace-nowrap font-medium">{r.name}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">Category is "{r.category}"</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-sm">Assign to {r.role} (Round Robin)</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm space-x-2">
                                            <button onClick={() => handleOpenAssignmentRuleModal(r)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                                            <button onClick={() => deleteAssignmentRule(r.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                             </tbody>
                        </table>
                    </div>
                </div>

                {/* Prioritization Rules (UI would be similar) */}
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Prioritization Rules</h2>
                    {/* Placeholder for table and add button */}
                     <div className="text-sm p-4 border dark:border-gray-700 rounded-md text-gray-500">Prioritization rule management UI coming soon.</div>
                </div>

                {/* Escalation Rules (UI would be similar) */}
                <div>
                     <h2 className="text-xl font-semibold mb-4">Escalation Rules (SLAs)</h2>
                     {/* Placeholder for table and add button */}
                     <div className="text-sm p-4 border dark:border-gray-700 rounded-md text-gray-500">Escalation rule management UI coming soon.</div>
                </div>

            </div>

            <UserFormModal
                isOpen={isUserModalOpen}
                onClose={() => setUserModalOpen(false)}
                onSubmit={handleUserSubmit}
                userToEdit={userToEdit}
            />
            <WorkflowFormModal 
                isOpen={isWorkflowModalOpen}
                onClose={() => setWorkflowModalOpen(false)}
                onSubmit={handleWorkflowSubmit}
                workflowToEdit={workflowToEdit}
            />
            <AssignmentRuleModal
                isOpen={isAssignmentRuleModalOpen}
                onClose={() => setAssignmentRuleModalOpen(false)}
                onSubmit={handleAssignmentRuleSubmit}
                ruleToEdit={assignmentRuleToEdit}
            />
        </div>
    );
};
