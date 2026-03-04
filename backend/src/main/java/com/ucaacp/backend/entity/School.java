package com.ucaacp.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;

@Data
@Entity
@Table(name = "school", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"province_name", "school_name"}, name = "uk_school")
})
public class School {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id", nullable = false)
    private Long id;

    @Column(name = "province_name", nullable = false, length = 20)
    private String provinceName;

    @Column(name = "school_name", nullable = false, length = 120)
    private String schoolName;

    @Column(name = "school_code", nullable = false, length = 20)
    private String schoolCode;

    @Column(name = "department", length = 60)
    private String department;

    @Column(name = "location", length = 40)
    private String location;

    @Column(name = "level", length = 20)
    private String level;

    @Column(name = "remark", length = 120)
    private String remark;
}
