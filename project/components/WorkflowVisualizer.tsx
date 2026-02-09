import React from 'react';
import { Workflow, Status } from '../types';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from './icons';

interface WorkflowVisualizerProps {
    workflow: Workflow;
    currentStageIndex: number;
    status: Status;
}

export const WorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({ workflow, currentStageIndex, status }) => {
    return (
        <div className="flex items-center w-full">
            {workflow.stages.map((stage, index) => {
                const isCompleted = status === Status.Approved || status === Status.InProgress || status === Status.Completed || status === Status.Closed || (status === Status.InApproval && index < currentStageIndex);
                const isCurrent = status === Status.InApproval && index === currentStageIndex;
                const isRejected = status === Status.Rejected && index === currentStageIndex;
                const isPending = !isCompleted && !isCurrent && !isRejected;

                let colorClass = 'text-gray-400 dark:text-gray-500';
                let icon = <div className="w-4 h-4 bg-gray-300 rounded-full" />;
                if (isCompleted) {
                    colorClass = 'text-green-600 dark:text-green-400';
                    icon = <CheckCircleIcon className="w-6 h-6" />;
                } else if (isCurrent) {
                    colorClass = 'text-blue-600 dark:text-blue-400 font-semibold';
                    icon = <ClockIcon className="w-6 h-6 animate-pulse" />;
                } else if (isRejected) {
                     colorClass = 'text-red-600 dark:text-red-400 font-semibold';
                     icon = <XCircleIcon className="w-6 h-6" />;
                }

                return (
                    <React.Fragment key={stage.id}>
                        <div className="flex flex-col items-center">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isCurrent || isRejected ? 'bg-blue-100 dark:bg-blue-900' : ''} ${isCompleted ? 'bg-green-100 dark:bg-green-900' : ''}`}>
                               <div className={colorClass}>{icon}</div>
                            </div>
                            <p className={`mt-2 text-xs text-center ${colorClass}`}>{stage.name}</p>
                            <p className={`text-xs ${colorClass}`}>({stage.approverRole})</p>
                        </div>

                        {index < workflow.stages.length - 1 && (
                            <div className={`flex-auto border-t-2 transition-all duration-500 ease-in-out ${isCompleted ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'}`}></div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
