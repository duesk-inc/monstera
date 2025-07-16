// プロジェクト履歴タブコンポーネント

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Calendar, User } from "lucide-react";

// プロジェクト履歴の型定義
interface ProjectHistory {
  id: string;
  projectName: string;
  clientName: string;
  role: string;
  startDate: string;
  endDate?: string;
  status: "ongoing" | "completed" | "cancelled";
  description?: string;
  technologies: string[];
  processes: string[];
}

interface ProjectHistoryTabProps {
  engineerId: string;
  projectHistory: ProjectHistory[];
  onEdit?: (projectHistory: ProjectHistory) => void;
  onDelete?: (id: string) => void;
  onAdd?: () => void;
}

// ステータスの色定義
const statusColors = {
  ongoing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

// ステータスのラベル
const statusLabels = {
  ongoing: "進行中",
  completed: "完了",
  cancelled: "キャンセル",
};

export const ProjectHistoryTab: React.FC<ProjectHistoryTabProps> = ({
  engineerId,
  projectHistory,
  onEdit,
  onDelete,
  onAdd,
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  };

  const calculateDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffInMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return diffInMonths > 0 ? `${diffInMonths}ヶ月` : "1ヶ月未満";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            プロジェクト履歴
          </CardTitle>
          {onAdd && (
            <Button onClick={onAdd} size="sm" className="flex items-center gap-1">
              <Plus className="w-4 h-4" />
              プロジェクトを追加
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {projectHistory.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            プロジェクト履歴がありません。
          </div>
        ) : (
          <div className="space-y-4">
            {projectHistory.map((project) => (
              <Card key={project.id} className="border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-semibold">{project.projectName}</h3>
                      <p className="text-sm text-gray-600">{project.clientName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={statusColors[project.status]}>
                        {statusLabels[project.status]}
                      </Badge>
                      {onEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(project)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(project.id)}
                          className="h-8 w-8 p-0 text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">担当役割</p>
                      <p className="text-sm">{project.role}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">期間</p>
                      <p className="text-sm">
                        {formatDate(project.startDate)} 〜 {project.endDate ? formatDate(project.endDate) : "現在"}
                        <span className="text-gray-500 ml-2">
                          ({calculateDuration(project.startDate, project.endDate)})
                        </span>
                      </p>
                    </div>
                  </div>

                  {project.description && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-gray-700">概要</p>
                      <p className="text-sm text-gray-600">{project.description}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {project.technologies.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">使用技術</p>
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.map((tech, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tech}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {project.processes.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">担当工程</p>
                        <div className="flex flex-wrap gap-1">
                          {project.processes.map((process, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {process}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectHistoryTab;