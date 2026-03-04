import React from "react";

type DateTimeField = "startDate" | "startTime" | "endDate" | "endTime";

export interface AppointmentDateTimeRangeFieldsProps {
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    onChange: (field: DateTimeField, value: string) => void;
    disabled?: boolean;
    required?: boolean;
    timeStep?: number;
    startDateLabel?: string;
    startTimeLabel?: string;
    endDateLabel?: string;
    endTimeLabel?: string;
}

export const AppointmentDateTimeRangeFields: React.FC<AppointmentDateTimeRangeFieldsProps> = ({
    startDate,
    startTime,
    endDate,
    endTime,
    onChange,
    disabled = false,
    required = true,
    timeStep = 300,
    startDateLabel = "预约开始日期",
    startTimeLabel = "预约开始时间",
    endDateLabel = "预约结束日期",
    endTimeLabel = "预约结束时间"
}) => {
    return (
        <div className="appointment-reschedule-grid">
            <div className="appointment-reschedule-item">
                <label>{startDateLabel}</label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(event) => onChange("startDate", event.target.value)}
                    disabled={disabled}
                    required={required}
                />
            </div>
            <div className="appointment-reschedule-item">
                <label>{startTimeLabel}</label>
                <input
                    type="time"
                    value={startTime}
                    step={timeStep}
                    onChange={(event) => onChange("startTime", event.target.value)}
                    disabled={disabled}
                    required={required}
                />
            </div>
            <div className="appointment-reschedule-item">
                <label>{endDateLabel}</label>
                <input
                    type="date"
                    value={endDate}
                    onChange={(event) => onChange("endDate", event.target.value)}
                    disabled={disabled}
                    required={required}
                />
            </div>
            <div className="appointment-reschedule-item">
                <label>{endTimeLabel}</label>
                <input
                    type="time"
                    value={endTime}
                    step={timeStep}
                    onChange={(event) => onChange("endTime", event.target.value)}
                    disabled={disabled}
                    required={required}
                />
            </div>
        </div>
    );
};

