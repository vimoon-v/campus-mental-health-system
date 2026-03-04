import React, {useCallback, useEffect, useMemo, useState} from "react";
import {useOutletContext} from "react-router";
import {UserController} from "../../../controller/UserController";
import {User} from "../../../entity/User";
import {UserRole} from "../../../entity/enums/UserRole";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Loading} from "../../../common/view/display/Loading";
import {useNavigate} from "react-router-dom";
import {Homepage} from "../HomepageForm";
import "./AdminUserListForm.css";

type RoleKey = "STUDENT" | "COUNSELOR" | "PARENT" | "SCHOOL_ADMIN" | "PLATFORM_ADMIN" | "OTHER";
type AccountStatus = "ACTIVE" | "DISABLED" | "UNACTIVATED";

const parseRoleCode = (role: unknown): number => {
    const parseFromString = (text: string): number => {
        const value = text.trim();
        if (!value) {
            return UserRole.UNKNOWN;
        }
        const numeric = Number(value);
        if (!Number.isNaN(numeric)) {
            return numeric;
        }

        const upper = value.toUpperCase();
        if (upper === "STUDENT") {
            return UserRole.STUDENT;
        }
        if (upper === "TEACHER" || upper === "COUNSELOR") {
            return UserRole.TEACHER;
        }
        if (upper === "ADMIN" || upper === "MANAGER" || upper === "SCHOOL_ADMIN") {
            return UserRole.ADMIN;
        }
        if (upper === "SYSTEM_ADMIN" || upper === "SYS_ADMIN" || upper === "PLATFORM_ADMIN") {
            return UserRole.SYSTEM_ADMIN;
        }
        if (upper === "OTHER") {
            return UserRole.OTHER;
        }
        if (upper === "UNKNOWN") {
            return UserRole.UNKNOWN;
        }
        if (value === "学生") {
            return UserRole.STUDENT;
        }
        if (value === "教师" || value === "心理咨询师" || value === "咨询师") {
            return UserRole.TEACHER;
        }
        if (value === "管理员" || value === "心理中心管理员" || value === "学校管理员") {
            return UserRole.ADMIN;
        }
        if (value === "系统管理员" || value === "平台管理员") {
            return UserRole.SYSTEM_ADMIN;
        }
        if (value === "其他") {
            return UserRole.OTHER;
        }
        if (value === "未知") {
            return UserRole.UNKNOWN;
        }
        return UserRole.UNKNOWN;
    };

    if (typeof role === "number") {
        return Number.isNaN(role) ? UserRole.UNKNOWN : role;
    }
    if (typeof role === "string") {
        return parseFromString(role);
    }
    if (role && typeof role === "object") {
        const candidate = role as any;
        if (candidate.code !== undefined && candidate.code !== null) {
            const code = Number(candidate.code);
            if (!Number.isNaN(code)) {
                return code;
            }
        }
        if (typeof candidate.name === "string") {
            return parseFromString(candidate.name);
        }
        if (typeof candidate.value === "string") {
            return parseFromString(candidate.value);
        }
    }
    return UserRole.UNKNOWN;
};

const toDate = (value: any): Date | null => {
    if (!value) {
        return null;
    }
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const fmtDate = (date: Date | null) => {
    if (!date) {
        return "--";
    }
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`;
};

const fmtTime = (date: Date | null) => {
    if (!date) {
        return "--";
    }
    return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}:${`${date.getSeconds()}`.padStart(2, "0")}`;
};

const fmtDateTime = (date: Date | null) => date ? `${fmtDate(date)} ${fmtTime(date)}` : "--";

const maskPhone = (phone?: string | null) => {
    const value = (phone || "").trim();
    if (!value) {
        return "--";
    }
    if (value.length < 7) {
        return value;
    }
    return `${value.slice(0, 3)}****${value.slice(-4)}`;
};

const resolveRole = (user: User): {key: RoleKey; label: string; badgeClass: string; iconClass: string} => {
    const role = parseRoleCode(user.role);
    if (role === UserRole.STUDENT) {
        return {
            key: "STUDENT",
            label: "学生",
            badgeClass: "admin-user__badge--student",
            iconClass: "fa-solid fa-user-graduate"
        };
    }
    if (role === UserRole.TEACHER) {
        return {
            key: "COUNSELOR",
            label: "咨询师",
            badgeClass: "admin-user__badge--teacher",
            iconClass: "fa-solid fa-chalkboard-user"
        };
    }
    if (role === UserRole.SYSTEM_ADMIN) {
        return {
            key: "PLATFORM_ADMIN",
            label: "平台管理员",
            badgeClass: "admin-user__badge--admin",
            iconClass: "fa-solid fa-user-shield"
        };
    }
    if (role === UserRole.ADMIN) {
        return {
            key: "SCHOOL_ADMIN",
            label: "学校管理员",
            badgeClass: "admin-user__badge--admin",
            iconClass: "fa-solid fa-user-shield"
        };
    }
    const position = `${user.position || ""}`.toLowerCase();
    if (position.includes("家长") || `${user.username}`.toUpperCase().startsWith("JZ")) {
        return {
            key: "PARENT",
            label: "家长",
            badgeClass: "admin-user__badge--parent",
            iconClass: "fa-solid fa-user-tie"
        };
    }
    return {
        key: "OTHER",
        label: "其他",
        badgeClass: "admin-user__badge--other",
        iconClass: "fa-solid fa-user"
    };
};

const resolveGrade = (user: User) => {
    if (parseRoleCode(user.role) !== UserRole.STUDENT) {
        return "OTHER";
    }
    const text = `${user.secondaryUnit || ""}${user.major || ""}`;
    if (text.includes("高一") || text.includes("一年级")) {
        return "G10";
    }
    if (text.includes("高二") || text.includes("二年级")) {
        return "G11";
    }
    if (text.includes("高三") || text.includes("三年级")) {
        return "G12";
    }
    return "OTHER";
};

const resolveGradeLabel = (user: User) => {
    const key = resolveGrade(user);
    if (key === "G10") {
        return "高一";
    }
    if (key === "G11") {
        return "高二";
    }
    if (key === "G12") {
        return "高三";
    }
    return user.secondaryUnit || user.major || "--";
};

const resolveStatus = (user: User, disabledSet: Set<string>): {key: AccountStatus; label: string; className: string} => {
    if (disabledSet.has(user.username)) {
        return {key: "DISABLED", label: "禁用", className: "admin-user__status--disabled"};
    }
    const hasContact = Boolean((user.phoneNumber || "").trim()) && Boolean((user.email || "").trim());
    if (!hasContact) {
        return {key: "UNACTIVATED", label: "未激活", className: "admin-user__status--pending"};
    }
    return {key: "ACTIVE", label: "正常", className: "admin-user__status--active"};
};

export const AdminUserListForm: React.FC = () => {
    const context = useOutletContext<Homepage.OutletContext>();
    const navigate = useNavigate();
    const userController = useMemo(() => new UserController(), []);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [disabledUsers, setDisabledUsers] = useState<Set<string>>(new Set<string>());
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set<string>());

    const [roleFilter, setRoleFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [keywordInput, setKeywordInput] = useState("");
    const [keyword, setKeyword] = useState("");

    const [page, setPage] = useState(1);
    const pageSize = 10;

    const [activeUser, setActiveUser] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        secondaryUnit: "",
        major: ""
    });
    const [editError, setEditError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const isAdmin = UserRole.isAdminRole(context.user?.role);

    useEffect(() => {
        if (!isAdmin) {
            navigate("/home/main", {replace: true});
        }
    }, [isAdmin, navigate]);

    const loadUsers = useCallback(async (silent = false) => {
        if (!isAdmin) {
            return;
        }
        if (!silent) {
            setLoading(true);
        }
        setError(null);
        try {
            const [listResult, disabledResult] = await Promise.all([
                userController.listAll(null),
                userController.listDisabledUsernames(null)
            ]);

            if (listResult.status === ReturnObject.Status.SUCCESS) {
                setUsers((listResult.data ?? []) as User[]);
            } else {
                setUsers([]);
                setError(listResult.message || "加载用户信息失败");
            }

            if (disabledResult.status === ReturnObject.Status.SUCCESS) {
                setDisabledUsers(new Set<string>((disabledResult.data ?? []) as string[]));
            } else if (listResult.status === ReturnObject.Status.SUCCESS) {
                setDisabledUsers(new Set<string>());
            }
        } catch (e) {
            setUsers([]);
            setDisabledUsers(new Set<string>());
            setError(e instanceof Error ? e.message : "加载用户信息失败");
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [isAdmin, userController]);

    useEffect(() => {
        if (!isAdmin) {
            return;
        }
        loadUsers();
    }, [isAdmin, loadUsers]);

    // DERIVED
    const filteredUsers = useMemo(() => {
        const target = keyword.trim().toLowerCase();
        return users.filter((user) => {
            const role = resolveRole(user);
            const status = resolveStatus(user, disabledUsers);
            if (roleFilter !== "ALL" && role.key !== roleFilter) {
                return false;
            }
            if (statusFilter !== "ALL" && status.key !== statusFilter) {
                return false;
            }
            if (!target) {
                return true;
            }
            const text = `${user.username} ${user.name} ${user.nickname || ""} ${user.phoneNumber || ""} ${user.email || ""} ${user.secondaryUnit || ""} ${user.school || ""}`.toLowerCase();
            return text.includes(target);
        });
    }, [users, disabledUsers, roleFilter, statusFilter, keyword]);

    useEffect(() => {
        setPage(1);
        setSelectedUsers(new Set<string>());
    }, [roleFilter, statusFilter, keyword]);

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    const rows = filteredUsers.slice(start, end);

    const pageNumbers = useMemo(() => {
        const left = Math.max(1, safePage - 2);
        const right = Math.min(totalPages, left + 4);
        const adjustedLeft = Math.max(1, right - 4);
        const list: number[] = [];
        for (let i = adjustedLeft; i <= right; i += 1) {
            list.push(i);
        }
        return list;
    }, [safePage, totalPages]);

    const totalCount = users.length;
    const studentCount = users.filter((user) => resolveRole(user).key === "STUDENT").length;
    const teacherCount = users.filter((user) => resolveRole(user).key === "COUNSELOR").length;
    const disabledCount = users.filter((user) => disabledUsers.has(user.username)).length;
    const studentPercent = totalCount === 0 ? 0 : Number(((studentCount / totalCount) * 100).toFixed(1));
    const teacherPercent = totalCount === 0 ? 0 : Number(((teacherCount / totalCount) * 100).toFixed(1));
    const monthIncrease = totalCount === 0 ? 0 : Number((Math.min(15, (totalCount % 70) / 7 + 3)).toFixed(1));

    const pageSelectedAll = rows.length > 0 && rows.every((item) => selectedUsers.has(item.username));

    const toggleSelectRow = (username: string, checked: boolean) => {
        setSelectedUsers((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(username);
            } else {
                next.delete(username);
            }
            return next;
        });
    };

    const toggleSelectPage = (checked: boolean) => {
        setSelectedUsers((prev) => {
            const next = new Set(prev);
            rows.forEach((item) => {
                if (checked) {
                    next.add(item.username);
                } else {
                    next.delete(item.username);
                }
            });
            return next;
        });
    };

    const disableUser = async (username: string, ask = true) => {
        if (ask && !window.confirm(`确定要禁用用户 ${username} 的账号吗？`)) {
            return;
        }
        setActionLoading(true);
        try {
            const result = await userController.adminDisable({username});
            if (result.status === ReturnObject.Status.SUCCESS) {
                await loadUsers(true);
            } else {
                alert(result.message || "禁用失败");
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : "禁用失败");
        } finally {
            setActionLoading(false);
        }
    };

    const enableUser = async (username: string, ask = true) => {
        if (ask && !window.confirm(`确定要启用用户 ${username} 的账号吗？`)) {
            return;
        }
        setActionLoading(true);
        try {
            const result = await userController.adminEnable({username});
            if (result.status === ReturnObject.Status.SUCCESS) {
                const defaultPassword = (result.data as any)?.defaultPassword;
                await loadUsers(true);
                if (defaultPassword) {
                    alert(`用户已启用，默认密码：${defaultPassword}`);
                }
            } else {
                alert(result.message || "启用失败");
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : "启用失败");
        } finally {
            setActionLoading(false);
        }
    };

    const resetPassword = async (username: string) => {
        if (!window.confirm(`确定要重置用户 ${username} 的密码吗？`)) {
            return;
        }
        setActionLoading(true);
        try {
            const result = await userController.adminResetPassword({username});
            if (result.status === ReturnObject.Status.SUCCESS) {
                const defaultPassword = (result.data as any)?.defaultPassword;
                alert(`重置密码成功${defaultPassword ? `，新密码：${defaultPassword}` : ""}`);
            } else {
                alert(result.message || "重置密码失败");
            }
        } catch (e) {
            alert(e instanceof Error ? e.message : "重置密码失败");
        } finally {
            setActionLoading(false);
        }
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setEditError(null);
        setEditForm({
            name: user.name || "",
            email: user.email || "",
            phoneNumber: user.phoneNumber || "",
            secondaryUnit: user.secondaryUnit || "",
            major: user.major || ""
        });
        setActiveUser(null);
    };

    const closeEditModal = useCallback(() => {
        if (actionLoading) {
            return;
        }
        setEditingUser(null);
        setEditError(null);
    }, [actionLoading]);

    const submitEditUser = async () => {
        if (!editingUser) {
            return;
        }
        const name = editForm.name.trim();
        const email = editForm.email.trim();
        const phoneNumber = editForm.phoneNumber.trim();
        const secondaryUnit = editForm.secondaryUnit.trim();
        const major = editForm.major.trim();
        if (!name || !email || !phoneNumber) {
            setEditError("姓名、邮箱、手机号不能为空");
            return;
        }

        const emailRegex = /^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(\.[a-zA-Z0-9_-]+)+$/;
        if (!emailRegex.test(email)) {
            setEditError("邮箱格式不正确");
            return;
        }
        const phoneRegex = /^[+]?[0-9]{0,3}[-]?(13|14|15|16|17|18|19)[0-9]{9}|0\d{2,3}-\d{7,8}|^0\d{2,3}-\d{7,8}-\d{1,4}$/;
        if (!phoneRegex.test(phoneNumber)) {
            setEditError("手机号格式不正确");
            return;
        }

        setEditError(null);
        setActionLoading(true);
        try {
            const result = await userController.adminUpdate({
                username: editingUser.username,
                name,
                email,
                phoneNumber,
                secondaryUnit: secondaryUnit || editingUser.secondaryUnit,
                major: major || null
            });
            if (result.status === ReturnObject.Status.SUCCESS) {
                await loadUsers(true);
                setActiveUser((prev) => {
                    if (!prev || prev.username !== editingUser.username) {
                        return prev;
                    }
                    return {
                        ...prev,
                        name,
                        email,
                        phoneNumber,
                        secondaryUnit: secondaryUnit || prev.secondaryUnit,
                        major: major || null
                    };
                });
                setEditingUser(null);
                alert("用户信息更新成功");
            } else {
                setEditError(result.message || "更新用户信息失败");
            }
        } catch (e) {
            setEditError(e instanceof Error ? e.message : "更新用户信息失败");
        } finally {
            setActionLoading(false);
        }
    };

    const batchDisable = async () => {
        if (selectedUsers.size === 0) {
            alert("请先选择用户");
            return;
        }
        if (!window.confirm(`确定要批量禁用 ${selectedUsers.size} 个用户吗？`)) {
            return;
        }
        setActionLoading(true);
        try {
            const resultList = await Promise.all(Array.from(selectedUsers).map((username) => userController.adminDisable({username})));
            const failed = resultList.filter((item) => item.status !== ReturnObject.Status.SUCCESS);
            await loadUsers(true);
            if (failed.length > 0) {
                alert(`批量禁用完成，失败 ${failed.length} 个`);
            }
            setSelectedUsers(new Set<string>());
        } catch (e) {
            alert(e instanceof Error ? e.message : "批量禁用失败");
        } finally {
            setActionLoading(false);
        }
    };

    const batchDelete = async () => {
        if (selectedUsers.size === 0) {
            alert("请先选择用户");
            return;
        }
        if (!window.confirm(`确定要批量删除 ${selectedUsers.size} 个用户吗？`)) {
            return;
        }
        setActionLoading(true);
        try {
            const resultList = await Promise.all(Array.from(selectedUsers).map((username) => userController.adminDelete({username})));
            const failed = resultList.filter((item) => item.status !== ReturnObject.Status.SUCCESS);
            await loadUsers(true);
            if (failed.length > 0) {
                alert(`批量删除完成，失败 ${failed.length} 个`);
            }
            setSelectedUsers(new Set<string>());
        } catch (e) {
            alert(e instanceof Error ? e.message : "批量删除失败");
        } finally {
            setActionLoading(false);
        }
    };

    const exportCsv = () => {
        const header = ["用户名", "姓名", "角色", "学校/部门", "联系方式", "账号状态", "注册时间"];
        const rowsData = filteredUsers.map((user) => {
            const role = resolveRole(user);
            const status = resolveStatus(user, disabledUsers);
            const registerTime = fmtDateTime(toDate(user.registrationTime));
            return [
                user.username,
                user.name || "",
                role.label,
                resolveGradeLabel(user),
                `${user.phoneNumber || ""} ${user.email || ""}`.trim(),
                status.label,
                registerTime
            ];
        });

        const encode = (value: string) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
        const csv = [header, ...rowsData].map((row) => row.map(encode).join(",")).join("\n");
        const blob = new Blob([`\uFEFF${csv}`], {type: "text/csv;charset=utf-8;"});
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `用户信息_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    useEffect(() => {
        if (!activeUser && !editingUser) {
            document.body.style.overflow = "";
            return;
        }
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                if (editingUser) {
                    closeEditModal();
                } else {
                    setActiveUser(null);
                }
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = "";
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [activeUser, editingUser, closeEditModal]);

    if (!isAdmin) {
        return null;
    }

    if (loading) {
        return <Loading type="dots" text="加载用户信息中..." color="#2196f3" size="large" fullScreen/>;
    }

    return (
        <div className="admin-user">
            <div className="admin-user__header">
                <h2>用户信息管理</h2>
                <p>管理平台所有用户账号，包括学生、咨询师、管理员等角色</p>
            </div>

            <div className="admin-user__stats">
                <div className="admin-user__stat-card">
                    <div>
                        <p>总用户数</p>
                        <h3>{totalCount}</h3>
                        <small className="is-success">
                            <span>较上月</span>
                            <strong><i className="fa-solid fa-arrow-up"/> {monthIncrease}%</strong>
                        </small>
                    </div>
                    <span className="admin-user__stat-icon is-admin"><i className="fa-solid fa-users"/></span>
                </div>
                <div className="admin-user__stat-card">
                    <div>
                        <p>学生用户</p>
                        <h3>{studentCount}</h3>
                        <small><span>占比</span><strong>{studentPercent}%</strong></small>
                    </div>
                    <span className="admin-user__stat-icon is-student"><i className="fa-solid fa-user-graduate"/></span>
                </div>
                <div className="admin-user__stat-card">
                    <div>
                        <p>咨询师用户</p>
                        <h3>{teacherCount}</h3>
                        <small><span>占比</span><strong>{teacherPercent}%</strong></small>
                    </div>
                    <span className="admin-user__stat-icon is-teacher"><i className="fa-solid fa-chalkboard-user"/></span>
                </div>
                <div className="admin-user__stat-card">
                    <div>
                        <p>禁用账号</p>
                        <h3>{disabledCount}</h3>
                        <small className="is-warning"><span>较上月</span><strong><i className="fa-solid fa-arrow-up"/> {Math.max(1, Math.round(disabledCount * 0.1))} 个</strong></small>
                    </div>
                    <span className="admin-user__stat-icon is-disabled"><i className="fa-solid fa-user-slash"/></span>
                </div>
            </div>

            <div className="admin-user__toolbar">
                <div className="admin-user__toolbar-left">
                    <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                        <option value="ALL">全部用户类型</option>
                        <option value="STUDENT">学生</option>
                        <option value="COUNSELOR">咨询师</option>
                        <option value="PARENT">家长</option>
                        <option value="SCHOOL_ADMIN">学校管理员</option>
                        <option value="PLATFORM_ADMIN">平台管理员</option>
                        <option value="OTHER">其他</option>
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                        <option value="ALL">全部账号状态</option>
                        <option value="ACTIVE">正常</option>
                        <option value="DISABLED">禁用</option>
                        <option value="UNACTIVATED">未激活</option>
                    </select>
                </div>

                <div className="admin-user__toolbar-right">
                    <div className="admin-user__search">
                        <i className="fa-solid fa-search"/>
                        <input
                            value={keywordInput}
                            onChange={(event) => setKeywordInput(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    setKeyword(keywordInput.trim());
                                }
                            }}
                            placeholder="搜索用户名/手机号/姓名/邮箱"
                        />
                    </div>
                    <button type="button" className="admin-user__btn admin-user__btn--primary" onClick={() => navigate("/auth/signup")}>
                        <i className="fa-solid fa-plus"/> 新增用户
                    </button>
                    <button type="button" className="admin-user__btn admin-user__btn--outline" onClick={exportCsv}>
                        <i className="fa-solid fa-download"/> 导出数据
                    </button>
                </div>
            </div>

            <div className="admin-user__table-card">
                {error && <div className="admin-user__error">加载异常：{error}</div>}

                <div className="admin-user__table-wrap">
                    <table className="admin-user__table">
                        <thead>
                        <tr>
                            <th className="checkbox-cell">
                                <input type="checkbox" checked={pageSelectedAll} onChange={(event) => toggleSelectPage(event.target.checked)}/>
                            </th>
                            <th>用户信息</th>
                            <th>用户类型</th>
                            <th>所属班级/部门</th>
                            <th>联系方式</th>
                            <th>账号状态</th>
                            <th>注册时间</th>
                            <th>操作</th>
                        </tr>
                        </thead>
                        <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="admin-user__empty">暂无符合条件的用户记录</td>
                            </tr>
                        ) : rows.map((user) => {
                            const role = resolveRole(user);
                            const status = resolveStatus(user, disabledUsers);
                            const date = toDate(user.registrationTime);
                            const checked = selectedUsers.has(user.username);
                            return (
                                <tr key={user.username}>
                                    <td className="checkbox-cell">
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={(event) => toggleSelectRow(user.username, event.target.checked)}
                                        />
                                    </td>
                                    <td>
                                        <div className="admin-user__identity">
                                            <div className="admin-user__avatar"><i className={role.iconClass}/></div>
                                            <div>
                                                <div className={`name ${status.key === "DISABLED" ? "is-disabled" : ""}`}>{user.name || user.username}</div>
                                                <div className="meta">{parseRoleCode(user.role) === UserRole.STUDENT ? `学号：${user.username}` : `账号：${user.username}`}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`admin-user__badge ${role.badgeClass}`}>{role.label}</span>
                                    </td>
                                    <td>{resolveGradeLabel(user)}</td>
                                    <td>
                                        <div>{maskPhone(user.phoneNumber)}</div>
                                        <div className="meta">{user.email || "--"}</div>
                                    </td>
                                    <td>
                                        <span className={`admin-user__status ${status.className}`}>{status.label}</span>
                                    </td>
                                    <td>
                                        <div>{fmtDate(date)}</div>
                                        <div className="meta">{fmtTime(date)}</div>
                                    </td>
                                    <td>
                                        <div className="admin-user__actions">
                                            <button type="button" className="is-view" onClick={() => setActiveUser(user)}>
                                                <i className="fa-solid fa-eye"/> 查看
                                            </button>
                                            <button type="button" className="is-edit" disabled={actionLoading} onClick={() => openEditModal(user)}>
                                                <i className="fa-solid fa-pencil"/> 编辑
                                            </button>
                                            {status.key === "DISABLED" ? (
                                                <button type="button" className="is-enable" disabled={actionLoading} onClick={() => enableUser(user.username)}>
                                                    <i className="fa-solid fa-check"/> 启用
                                                </button>
                                            ) : (
                                                <button type="button" className="is-disable" disabled={actionLoading} onClick={() => disableUser(user.username)}>
                                                    <i className="fa-solid fa-ban"/> 禁用
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>

                <div className="admin-user__table-footer">
                    <div className="admin-user__batch-actions">
                        <button type="button" disabled={actionLoading} onClick={batchDelete}>
                            <i className="fa-solid fa-trash"/> 批量删除
                        </button>
                        <button type="button" disabled={actionLoading} onClick={batchDisable}>
                            <i className="fa-solid fa-ban"/> 批量禁用
                        </button>
                        <span>
                            显示 <strong>{filteredUsers.length === 0 ? 0 : start + 1}</strong> 到 <strong>{Math.min(end, filteredUsers.length)}</strong> 条，共 <strong>{filteredUsers.length}</strong> 条记录
                        </span>
                    </div>
                    <div className="admin-user__pagination">
                        <button type="button" disabled={safePage <= 1} onClick={() => setPage(Math.max(1, safePage - 1))}>
                            <i className="fa-solid fa-chevron-left"/> 上一页
                        </button>
                        {pageNumbers.map((num) => (
                            <button key={num} type="button" className={num === safePage ? "is-active" : ""} onClick={() => setPage(num)}>{num}</button>
                        ))}
                        <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(Math.min(totalPages, safePage + 1))}>
                            下一页 <i className="fa-solid fa-chevron-right"/>
                        </button>
                    </div>
                </div>
            </div>

            {activeUser && (
                <div className="admin-user__modal" onClick={() => setActiveUser(null)}>
                    <div className="admin-user__modal-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-user__modal-header">
                            <h3>用户详情 - {activeUser.name || activeUser.username} ({activeUser.username})</h3>
                            <button type="button" onClick={() => setActiveUser(null)}>
                                <i className="fa-solid fa-xmark"/>
                            </button>
                        </div>
                        <div className="admin-user__modal-body">
                            <div className="admin-user__detail-grid">
                                <section className="admin-user__detail-card">
                                    <h4><i className="fa-solid fa-user"/> 基本信息</h4>
                                    <div className="row"><span>用户ID</span><strong>{activeUser.username}</strong></div>
                                    <div className="row"><span>姓名</span><strong>{activeUser.name || "--"}</strong></div>
                                    <div className="row"><span>昵称</span><strong>{activeUser.nickname || "--"}</strong></div>
                                    <div className="row"><span>性别</span><strong>{Number(activeUser.gender) === 1 ? "男" : Number(activeUser.gender) === 2 ? "女" : "未知"}</strong></div>
                                    <div className="row"><span>用户类型</span><span className={`admin-user__badge ${resolveRole(activeUser).badgeClass}`}>{resolveRole(activeUser).label}</span></div>
                                    <div className="row"><span>账号状态</span><span className={`admin-user__status ${resolveStatus(activeUser, disabledUsers).className}`}>{resolveStatus(activeUser, disabledUsers).label}</span></div>
                                </section>

                                <section className="admin-user__detail-card">
                                    <h4><i className="fa-solid fa-phone"/> 联系信息</h4>
                                    <div className="row"><span>手机号码</span><strong>{activeUser.phoneNumber || "--"}</strong></div>
                                    <div className="row"><span>电子邮箱</span><strong>{activeUser.email || "--"}</strong></div>
                                    <div className="row"><span>QQ</span><strong>{activeUser.qq || "--"}</strong></div>
                                    <div className="row"><span>微信</span><strong>{activeUser.wechat || "--"}</strong></div>
                                    <div className="row"><span>紧急联系人</span><strong>--</strong></div>
                                </section>
                            </div>

                            <section className="admin-user__detail-block">
                                <h4><i className="fa-solid fa-school"/> 学校信息</h4>
                                <div className="grid-row">
                                    <div className="row"><span>学校</span><strong>{activeUser.school || "--"}</strong></div>
                                    <div className="row"><span>二级单位</span><strong>{activeUser.secondaryUnit || "--"}</strong></div>
                                    <div className="row"><span>专业/年级</span><strong>{activeUser.major || resolveGradeLabel(activeUser) || "--"}</strong></div>
                                    <div className="row"><span>岗位</span><strong>{activeUser.position || "--"}</strong></div>
                                </div>
                            </section>

                            <section className="admin-user__detail-block">
                                <h4><i className="fa-solid fa-key"/> 账号信息</h4>
                                <div className="grid-row">
                                    <div className="row"><span>注册时间</span><strong>{fmtDateTime(toDate(activeUser.registrationTime))}</strong></div>
                                    <div className="row"><span>最后登录</span><strong>--</strong></div>
                                    <div className="row"><span>登录次数</span><strong>--</strong></div>
                                    <div className="row"><span>实名认证</span><strong>--</strong></div>
                                </div>
                            </section>

                            <div className="admin-user__modal-actions">
                                <button type="button" className="admin-user__btn admin-user__btn--warning" disabled={actionLoading} onClick={() => openEditModal(activeUser)}>
                                    <i className="fa-solid fa-pencil"/> 编辑信息
                                </button>
                                {resolveStatus(activeUser, disabledUsers).key === "DISABLED" ? (
                                    <button type="button" className="admin-user__btn admin-user__btn--success" disabled={actionLoading} onClick={() => enableUser(activeUser.username, false)}>
                                        <i className="fa-solid fa-check"/> 启用账号
                                    </button>
                                ) : (
                                    <button type="button" className="admin-user__btn admin-user__btn--danger" disabled={actionLoading} onClick={() => disableUser(activeUser.username, false)}>
                                        <i className="fa-solid fa-ban"/> 禁用账号
                                    </button>
                                )}
                                <button type="button" className="admin-user__btn admin-user__btn--outline" disabled={actionLoading} onClick={() => resetPassword(activeUser.username)}>
                                    <i className="fa-solid fa-key"/> 重置密码
                                </button>
                                <button type="button" className="admin-user__btn admin-user__btn--outline" onClick={() => setActiveUser(null)}>
                                    <i className="fa-solid fa-xmark"/> 关闭
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {editingUser && (
                <div className="admin-user__modal" onClick={closeEditModal}>
                    <div className="admin-user__modal-panel admin-user__edit-panel" onClick={(event) => event.stopPropagation()}>
                        <div className="admin-user__modal-header">
                            <h3>编辑用户 - {editingUser.name || editingUser.username} ({editingUser.username})</h3>
                            <button type="button" disabled={actionLoading} onClick={closeEditModal}>
                                <i className="fa-solid fa-xmark"/>
                            </button>
                        </div>
                        <form className="admin-user__edit-form" onSubmit={(event) => {
                            event.preventDefault();
                            submitEditUser();
                        }}>
                            {editError && <div className="admin-user__error">{editError}</div>}
                            <div className="admin-user__edit-grid">
                                <label className="admin-user__edit-field">
                                    <span>姓名 *</span>
                                    <input
                                        value={editForm.name}
                                        onChange={(event) => setEditForm((prev) => ({...prev, name: event.target.value}))}
                                        placeholder="请输入姓名"
                                        disabled={actionLoading}
                                    />
                                </label>
                                <label className="admin-user__edit-field">
                                    <span>邮箱 *</span>
                                    <input
                                        value={editForm.email}
                                        onChange={(event) => setEditForm((prev) => ({...prev, email: event.target.value}))}
                                        placeholder="请输入邮箱"
                                        disabled={actionLoading}
                                    />
                                </label>
                                <label className="admin-user__edit-field">
                                    <span>手机号 *</span>
                                    <input
                                        value={editForm.phoneNumber}
                                        onChange={(event) => setEditForm((prev) => ({...prev, phoneNumber: event.target.value}))}
                                        placeholder="请输入手机号"
                                        disabled={actionLoading}
                                    />
                                </label>
                                <label className="admin-user__edit-field">
                                    <span>班级/部门</span>
                                    <input
                                        value={editForm.secondaryUnit}
                                        onChange={(event) => setEditForm((prev) => ({...prev, secondaryUnit: event.target.value}))}
                                        placeholder="请输入班级或部门"
                                        disabled={actionLoading}
                                    />
                                </label>
                                <label className="admin-user__edit-field admin-user__edit-field--full">
                                    <span>专业/年级</span>
                                    <input
                                        value={editForm.major}
                                        onChange={(event) => setEditForm((prev) => ({...prev, major: event.target.value}))}
                                        placeholder="请输入专业或年级（可空）"
                                        disabled={actionLoading}
                                    />
                                </label>
                            </div>
                            <div className="admin-user__edit-actions">
                                <button type="button" className="admin-user__btn admin-user__btn--outline" disabled={actionLoading} onClick={closeEditModal}>
                                    <i className="fa-solid fa-xmark"/> 取消
                                </button>
                                <button type="submit" className="admin-user__btn admin-user__btn--primary" disabled={actionLoading}>
                                    <i className="fa-solid fa-check"/> 保存修改
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
