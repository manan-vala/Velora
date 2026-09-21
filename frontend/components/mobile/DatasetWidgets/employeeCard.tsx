export interface EmployeeCardProps {
  name: string;
  priority: string;
  employeeId: string;
  pickupLocation: string;
  dropOffLocation: string;
  allotedVehicle: string;
}

export default function EmployeeCard(props: EmployeeCardProps) {
  let priorityClass = "bg-[#e2ffe2] text-[#00c100]";
  let dotColor = "bg-[#00c100]";
  const priorityText = props.priority;
  if (["1", 1, "2", 2].includes(props.priority)) {
    priorityClass = "bg-[#e2ffe2] text-[#00c100]";
    dotColor = "bg-[#00c100]";
  } else if (["3", 3, "4", 4].includes(props.priority)) {
    priorityClass = "bg-[#fff7e2] text-[#c18c00]";
    dotColor = "bg-[#c18c00]";
  } else {
    priorityClass = "bg-[#ffe2e2] text-[#c10007]";
    dotColor = "bg-[#c10007]";
  }

  return (
    <div className="relative w-full max-w-88 bg-white border border-[#d6d6d6] rounded-md shadow p-4 sm:p-6 mb-2">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="bg-white h-5 w-4.75 rounded-md border border-[#d5d7da]" />
        <div className="font-medium text-[#181d27] text-[13px] sm:text-[14px] truncate max-w-[200px]">{props.name}</div>
      </div>
      {/* Priority */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-[#717680] text-[12px]">Priority</span>
        <span className={`${priorityClass} rounded-full px-3 py-1 text-[12px]`}>
          {priorityText}
        </span>
      </div>
      {/* Employee ID */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-[#717680] text-[12px]">Employee ID</span>
        <span className="text-[#181d27] text-[12px]">{props.employeeId}</span>
      </div>
      {/* Pickup Location */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="font-medium text-[#717680] text-[12px] whitespace-nowrap">Pickup Location</span>
        <span className="text-[#181d27] text-[12px] truncate max-w-[150px]">{props.pickupLocation}</span>
      </div>
      {/* Drop-Off Location */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="font-medium text-[#717680] text-[12px] whitespace-nowrap">Drop-Off Location</span>
        <span className="text-[#181d27] text-[12px] truncate max-w-[150px]">{props.dropOffLocation}</span>
      </div>
      {/* Assigned Vehicle */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-[#717680] text-[12px]">Assigned Vehicle ID</span>
        <span className="text-[#181d27] text-[12px] truncate max-w-30">{props.allotedVehicle && props.allotedVehicle !== "N/A" ? props.allotedVehicle : "Not Assigned"}</span>
      </div>
    </div>
  );
}
