package com.ucaacp.backend.entity.enums;

import lombok.Getter;

/**
 * 用户角色枚举：
 * 当前角色划分：
 * 0未知，1学生(STUDENT)，2咨询师(COUNSELOR)，3学校管理员(SCHOOL_ADMIN)，4平台管理员(PLATFORM_ADMIN)，9其他
 */
@Getter
public enum UserRole {
    UNKNOWN(0,"未知"),
    STUDENT(1,"学生"),
    TEACHER(2,"咨询师"),
    ADMIN(3,"学校管理员"),
    SYSTEM_ADMIN(4,"平台管理员"),
    OTHER(9,"其他");
    private final Integer code;
    private final String name;
    private UserRole(Integer code,String name){
        this.code = code;
        this.name = name;
    }

    public static UserRole getByCode(Integer code){
        for(UserRole role : values()){
            if(role.code.equals(code)){
                return role;
            }
        }
        return UNKNOWN;
    }

    public static UserRole getByName(String name){
        for(UserRole role : values()){
            if(role.name.equals(name)){
                return role;
            }
        }
        return UNKNOWN;
    }

    public boolean isCounselor() {
        return this == TEACHER;
    }

    public boolean isSchoolAdmin() {
        return this == ADMIN;
    }

    public boolean isPlatformAdmin() {
        return this == SYSTEM_ADMIN;
    }

    public boolean isAnyAdmin() {
        return this == ADMIN || this == SYSTEM_ADMIN;
    }

    @Override
    public String toString() {
        return this.code.toString();
    }
}
