package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.Appointment;
import com.ucaacp.backend.entity.DTO.AppointmentDTO;
import com.ucaacp.backend.entity.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Integer>{



    @Query("SELECT new com.ucaacp.backend.entity.DTO.AppointmentDTO(a.appointmentId," +
            "       a.studentUsername," +
            "       stu.name ," +
            "       a.teacherUsername," +
            "       tea.name ," +
            "       a.description,a.anonymous,a.appointmentType,a.startTime,a.endTime,a.applyTime,a.acceptTime,a.status,a.rejectReason,a.reschedulePending,a.overdueFlagged) " +
            "FROM Appointment a " +
            "         LEFT JOIN User stu ON a.studentUsername = stu.username " +
            "         LEFT JOIN User tea ON a.teacherUsername = tea.username " +
            "WHERE a.studentUsername=:studentUsername ")
    public List<AppointmentDTO> findAppointmentDTOsByStudentUsername(@Param("studentUsername") String studentUsername);

    @Query("SELECT new com.ucaacp.backend.entity.DTO.AppointmentDTO(a.appointmentId," +
            "       a.studentUsername," +
            "       stu.name ," +
            "       a.teacherUsername," +
            "       tea.name ," +
            "       a.description,a.anonymous,a.appointmentType,a.startTime,a.endTime,a.applyTime,a.acceptTime,a.status,a.rejectReason,a.reschedulePending,a.overdueFlagged) " +
            "FROM Appointment a " +
            "         LEFT JOIN User stu ON a.studentUsername = stu.username " +
            "         LEFT JOIN User tea ON a.teacherUsername = tea.username " +
            "WHERE a.teacherUsername=:teacherUsername ")
    List<AppointmentDTO> findAppointmentDTOsByTeacherUsername(@Param("teacherUsername")String teacherUsername);


    @Query("SELECT new com.ucaacp.backend.entity.DTO.AppointmentDTO(a.appointmentId," +
            "       a.studentUsername," +
            "       stu.name ," +
            "       a.teacherUsername," +
            "       tea.name ," +
            "       a.description,a.anonymous,a.appointmentType,a.startTime,a.endTime,a.applyTime,a.acceptTime,a.status,a.rejectReason,a.reschedulePending,a.overdueFlagged) " +
            "FROM Appointment a " +
            "         LEFT JOIN User stu ON a.studentUsername = stu.username " +
            "         LEFT JOIN User tea ON a.teacherUsername = tea.username " +
            "WHERE a.teacherUsername=:teacherUsername AND a.status='WAITING'")
    List<AppointmentDTO> findAppointmentDTOsByTeacherUsernamePending(@Param("teacherUsername")String teacherUsername);

    @Query("SELECT new com.ucaacp.backend.entity.DTO.AppointmentDTO(a.appointmentId," +
            "       a.studentUsername," +
            "       stu.name ," +
            "       a.teacherUsername," +
            "       tea.name ," +
            "       a.description,a.anonymous,a.appointmentType,a.startTime,a.endTime,a.applyTime,a.acceptTime,a.status,a.rejectReason,a.reschedulePending,a.overdueFlagged) " +
            "FROM Appointment a " +
            "         LEFT JOIN User stu ON a.studentUsername = stu.username " +
            "         LEFT JOIN User tea ON a.teacherUsername = tea.username " +
            "WHERE a.teacherUsername=:teacherUsername AND a.status!='WAITING'")
    List<AppointmentDTO> findAppointmentDTOsByTeacherUsernameNonPending(@Param("teacherUsername")String teacherUsername);


    @Modifying
    @Query("UPDATE Appointment a SET a.status=:appointmentStatus, a.rejectReason=:rejectReason, a.acceptTime=:acceptTime, a.reschedulePending=:reschedulePending WHERE a.appointmentId=:appointmentId")
    int handle(
            @Param("appointmentId") Integer appointmentId,
            @Param("appointmentStatus") AppointmentStatus appointmentStatus,
            @Param("rejectReason") String rejectReason,
            @Param("acceptTime") java.time.LocalDateTime acceptTime,
            @Param("reschedulePending") Boolean reschedulePending
    );

    @Modifying
    @Query("UPDATE Appointment a SET a.overdueFlagged=true " +
            "WHERE a.status='WAITING' AND a.reschedulePending=false AND a.overdueFlagged=false AND a.applyTime<=:deadline")
    int markOverdueWaiting(@Param("deadline") LocalDateTime deadline);

    @Modifying
    @Query("UPDATE Appointment a SET a.overdueFlagged=false " +
            "WHERE a.overdueFlagged=true AND (a.status<>'WAITING' OR a.reschedulePending=true)")
    int clearInvalidOverdueFlag();

    @Query("SELECT a FROM Appointment a " +
            "WHERE a.status='WAITING' AND a.reschedulePending=false AND a.overdueFlagged=true " +
            "ORDER BY a.applyTime ASC")
    List<Appointment> findFlaggedOverdueWaitingAppointments();

    @Query("SELECT new com.ucaacp.backend.entity.DTO.AppointmentDTO(a.appointmentId," +
            "       a.studentUsername," +
            "       stu.name ," +
            "       a.teacherUsername," +
            "       tea.name ," +
            "       a.description,a.anonymous,a.appointmentType,a.startTime,a.endTime,a.applyTime,a.acceptTime,a.status,a.rejectReason,a.reschedulePending,a.overdueFlagged) " +
            "FROM Appointment a " +
            "         LEFT JOIN User stu ON a.studentUsername = stu.username " +
            "         LEFT JOIN User tea ON a.teacherUsername = tea.username ")
    List<AppointmentDTO> findAllAppointmentDTO();
}
