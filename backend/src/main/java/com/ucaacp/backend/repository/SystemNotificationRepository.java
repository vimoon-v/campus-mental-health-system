package com.ucaacp.backend.repository;

import com.ucaacp.backend.entity.SystemNotification;
import com.ucaacp.backend.entity.enums.NotificationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface SystemNotificationRepository extends JpaRepository<SystemNotification, Integer> {

    List<SystemNotification> findByRecipientUsernameOrderByCreatedTimeDesc(String recipientUsername);

    List<SystemNotification> findByRecipientUsernameAndIsReadOrderByCreatedTimeDesc(String recipientUsername, Boolean isRead);

    long countByRecipientUsernameAndIsReadFalse(String recipientUsername);

    @Modifying
    @Query("UPDATE SystemNotification n SET n.isRead = true WHERE n.notificationId = :notificationId AND n.recipientUsername = :recipientUsername")
    int markRead(@Param("notificationId") Integer notificationId, @Param("recipientUsername") String recipientUsername);

    @Modifying
    @Query("UPDATE SystemNotification n SET n.isRead = true WHERE n.recipientUsername = :recipientUsername AND n.isRead = false")
    int markAllRead(@Param("recipientUsername") String recipientUsername);

    List<SystemNotification> findByRecipientUsernameInAndNotificationTypeAndRelatedTypeAndRelatedId(
            Collection<String> recipientUsernames,
            NotificationType notificationType,
            String relatedType,
            Integer relatedId
    );

    List<SystemNotification> findByRecipientUsernameInAndRelatedTypeAndRelatedId(
            Collection<String> recipientUsernames,
            String relatedType,
            Integer relatedId
    );

    boolean existsByRecipientUsernameAndNotificationTypeAndTitleAndRelatedTypeAndRelatedId(
            String recipientUsername,
            NotificationType notificationType,
            String title,
            String relatedType,
            Integer relatedId
    );
}
