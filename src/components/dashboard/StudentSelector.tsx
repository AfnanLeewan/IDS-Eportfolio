import { useState } from "react";
import { motion } from "framer-motion";
import { Search, User, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface StudentSelectorProps {
  students: any[];
  onSelect: (student: any) => void;
  classes: any[];
}

export function StudentSelector({ students, onSelect, classes }: StudentSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredList = students.filter((student) =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="ค้นหานักเรียนด้วยชื่อ หรือรหัสนักเรียน..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[500px] rounded-md border p-4">
        {filteredList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <User className="h-12 w-12 mb-2 opacity-20" />
            <p>ไม่พบนักเรียนที่ค้นหา</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredList.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="cursor-pointer transition-all hover:bg-muted/50 hover:shadow-md border-muted"
                  onClick={() => onSelect(student)}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium truncate max-w-[120px] sm:max-w-[150px]">
                          {student.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {classes.find((c) => c.class_id === student.classId)?.class_name || student.classId}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                       <Badge variant="secondary" className={cn(
                          "font-mono",
                          student.totalScore?.percentage >= 80 ? "bg-success/15 text-success hover:bg-success/25" :
                          student.totalScore?.percentage < 50 ? "bg-destructive/15 text-destructive hover:bg-destructive/25" :
                          "bg-primary/10 text-primary hover:bg-primary/20"
                       )}>
                         {student.totalScore?.percentage?.toFixed(1) || 'N/A'}%
                       </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
