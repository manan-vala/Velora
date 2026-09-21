export interface VehicleCardProps {
  vehicle_id: string;
  vehicle_type: string;
  capacity: number;
  assigned_to?: string | string[];
}

export default function VehicleCard(props: VehicleCardProps) {
  return (
    <div className="relative w-full max-w-88 bg-white border border-[#d6d6d6] rounded-md shadow p-4 sm:p-6 mb-2">
      {/* Top Section */}

      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className="bg-white h-5 w-4.75 rounded-md border border-[#d5d7da]" />
        <div className="font-medium text-[#181d27] text-[13px] sm:text-[14px] truncate max-w-[200px]">Vehicle</div>
      </div>
      {/* Vehicle ID */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-[#717680] text-[12px]">Vehicle ID</span>
        <span className="text-[#181d27] text-[12px]">{props.vehicle_id}</span>
      </div>
      {/* Vehicle Type */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-[#717680] text-[12px]">Vehicle Type</span>
        <span className="text-[#181d27] text-[12px] truncate max-w-30">{props.vehicle_type}</span>
      </div>
      {/* Capacity */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-[#717680] text-[12px]">Capacity</span>
        <span className="text-[#181d27] text-[12px] truncate max-w-30">{props.capacity}</span>
      </div>
      {/* Assigned Employees */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="font-medium text-[#717680] text-[12px] whitespace-nowrap">Assigned Employees</span>
        <span className="text-[#181d27] text-[12px] truncate max-w-[150px]">
          {Array.isArray(props.assigned_to)
            ? props.assigned_to.length > 0
              ? props.assigned_to.join(", ")
              : "N/A"
            : props.assigned_to ?? "N/A"}
        </span>
      </div>
    </div>
  );
}

