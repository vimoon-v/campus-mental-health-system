import React, {useEffect, useMemo, useState} from "react";
import {useNavigate} from "react-router-dom";
import {AppointmentController} from "../../../controller/AppointmentController";
import {PsychKnowledgeController} from "../../../controller/PsychKnowledgeController";
import {User} from "../../../entity/User";
import {AppointmentDTO} from "../../../entity/AppointmentDTO";
import {PsychKnowledgeDTO} from "../../../entity/DTO/PsychKnowledgeDTO";
import {AppointmentStatus} from "../../../entity/enums/AppointmentStatus";
import {ReturnObject} from "../../../common/response/ReturnObject";
import {Loading} from "../../../common/view/display/Loading";
import heroImage1 from "../../../assets/hero/hero-1.png";
import heroImage2 from "../../../assets/hero/hero-2.png";
import heroImage3 from "../../../assets/hero/hero-3.png";
import "./StudentHomeDashboard.css";

interface StudentHomeDashboardProps {
    user: User;
}

const formatDate = (value: unknown) => {
    if (!value) {
        return "--";
    }
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) {
        return "--";
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatDateTime = (value: unknown) => {
    if (!value) {
        return "--";
    }
    const date = value instanceof Date ? value : new Date(value as string);
    if (Number.isNaN(date.getTime())) {
        return "--";
    }
    return `${formatDate(date)} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
};

const buildLinePath = (values: number[], width = 100, height = 46, maxValue = 100) => {
    if (values.length === 0) {
        return "";
    }
    return values.map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * width;
        const y = height - (value / maxValue) * height;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(" ");
};

const buildAreaPath = (values: number[], width = 100, height = 46, maxValue = 100) => {
    if (values.length === 0) {
        return "";
    }
    return `${buildLinePath(values, width, height, maxValue)} L ${width} ${height} L 0 ${height} Z`;
};

const statusMeta = (status: AppointmentStatus | string | undefined) => {
    if (status === AppointmentStatus.ACCEPTED) {
        return {text: "已通过", className: "is-success"};
    }
    if (status === AppointmentStatus.REJECTED) {
        return {text: "已拒绝", className: "is-danger"};
    }
    if (status === AppointmentStatus.FORCE_CANCELLED) {
        return {text: "已强制取消", className: "is-danger"};
    }
    if (status === AppointmentStatus.IN_PROGRESS) {
        return {text: "咨询中", className: "is-info"};
    }
    return {text: "待处理", className: "is-warning"};
};

const categoryLabel = (category?: string) => {
    if (!category) {
        return "心理成长";
    }
    const normalized = category.toLowerCase();
    if (normalized.includes("emotion") || normalized.includes("情绪")) {
        return "情绪管理";
    }
    if (normalized.includes("stress") || normalized.includes("压力")) {
        return "学习压力";
    }
    if (normalized.includes("relation") || normalized.includes("人际")) {
        return "人际交往";
    }
    return category;
};

const trimText = (value: string | undefined, length = 60) => {
    const text = (value || "").trim();
    if (!text) {
        return "点击查看详情，获取更多专业心理健康知识与建议。";
    }
    if (text.length <= length) {
        return text;
    }
    return `${text.slice(0, length)}...`;
};

export const StudentHomeDashboard: React.FC<StudentHomeDashboardProps> = ({user}) => {
    const navigate = useNavigate();
    const appointmentController = useMemo(() => new AppointmentController(), []);
    const knowledgeController = useMemo(() => new PsychKnowledgeController(), []);

    const [appointments, setAppointments] = useState<AppointmentDTO[]>([]);
    const [knowledgeList, setKnowledgeList] = useState<PsychKnowledgeDTO[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let canceled = false;
        const loadData = async () => {
            setLoading(true);
            setErrorMessage(null);
            try {
                const [appointmentResult, knowledgeResult] = await Promise.all([
                    appointmentController.findById({by: "studentUsername", username: user.username}),
                    knowledgeController.listPublic(null)
                ]);

                if (canceled) {
                    return;
                }

                if (appointmentResult.status === ReturnObject.Status.SUCCESS) {
                    setAppointments((appointmentResult.data ?? []) as AppointmentDTO[]);
                } else {
                    setAppointments([]);
                    setErrorMessage(appointmentResult.message || "预约数据加载失败");
                }

                if (knowledgeResult.status === ReturnObject.Status.SUCCESS) {
                    setKnowledgeList((knowledgeResult.data ?? []) as PsychKnowledgeDTO[]);
                } else {
                    setKnowledgeList([]);
                    if (!appointmentResult.data) {
                        setErrorMessage(knowledgeResult.message || "推荐内容加载失败");
                    }
                }
            } catch (e) {
                if (!canceled) {
                    setErrorMessage(e instanceof Error ? e.message : "首页数据加载失败");
                }
            } finally {
                if (!canceled) {
                    setLoading(false);
                }
            }
        };
        loadData();
        return () => {
            canceled = true;
        };
    }, [appointmentController, knowledgeController, user.username]);

    const sortedAppointments = useMemo(() => {
        return [...appointments].sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime());
    }, [appointments]);

    const pendingAppointments = useMemo(() => {
        return appointments.filter((item) => item.status === AppointmentStatus.WAITING);
    }, [appointments]);

    const confirmedAppointments = useMemo(() => {
        return appointments.filter((item) => item.status === AppointmentStatus.ACCEPTED || item.status === AppointmentStatus.IN_PROGRESS);
    }, [appointments]);

    const moodData = useMemo(() => {
        const boost = Math.min(10, confirmedAppointments.length * 2);
        return [76, 80, 78, 82, 84, 83, Math.min(95, 85 + boost)];
    }, [confirmedAppointments.length]);

    const stressData = useMemo(() => {
        const pressure = Math.min(12, pendingAppointments.length * 2);
        return [52, 50, 49, 47, 46, 44 + pressure, 42 + pressure];
    }, [pendingAppointments.length]);

    const moodLine = useMemo(() => buildLinePath(moodData), [moodData]);
    const moodArea = useMemo(() => buildAreaPath(moodData), [moodData]);
    const stressLine = useMemo(() => buildLinePath(stressData), [stressData]);
    const stressArea = useMemo(() => buildAreaPath(stressData), [stressData]);

    const moodIndex = moodData[moodData.length - 1];
    const stressIndex = stressData[stressData.length - 1];
    const assessmentCount = Math.max(1, Math.min(4, Math.round(knowledgeList.length / 12) + 1));

    const recommendCards = useMemo(() => {
        if (knowledgeList.length >= 3) {
            return knowledgeList.slice(0, 3).map((item, index) => ({
                id: String(item.knowledgeId),
                title: item.title || `心理科普 ${index + 1}`,
                summary: trimText(item.summary || item.content, 76),
                category: categoryLabel(item.category),
                views: item.viewCount ?? 0,
                date: formatDate(item.publishTime),
                image: [heroImage1, heroImage2, heroImage3][index % 3],
                path: `/psych_knowledge/detail/${item.knowledgeId}`
            }));
        }
        return [
            {
                id: "fallback-1",
                title: "青春期情绪调节：5个实用小技巧",
                summary: "青春期是情绪波动高峰期，学会这些调节方法，帮助你更好应对情绪变化。",
                category: "情绪管理",
                views: 3200,
                date: formatDate(new Date()),
                image: heroImage1,
                path: "/psych_knowledge/browse"
            },
            {
                id: "fallback-2",
                title: "如何缓解考试焦虑？专家建议",
                summary: "考试焦虑会影响发挥，这些科学减压方法可以帮助你在考试中更稳定。",
                category: "学习压力",
                views: 4500,
                date: formatDate(new Date()),
                image: heroImage2,
                path: "/psych_knowledge/browse"
            },
            {
                id: "fallback-3",
                title: "如何建立健康的校园人际关系",
                summary: "良好的人际关系是心理健康基础，学习沟通技巧让校园生活更轻松。",
                category: "人际交往",
                views: 2800,
                date: formatDate(new Date()),
                image: heroImage3,
                path: "/psych_knowledge/browse"
            }
        ];
    }, [knowledgeList]);

    const todoItems = useMemo(() => {
        const mapped = sortedAppointments.slice(0, 3).map((item) => ({
            id: String(item.appointmentId),
            title: "心理咨询预约",
            desc: `${formatDateTime(item.startTime)} | ${item.teacherName || item.teacherUsername || "咨询老师"}`,
            status: statusMeta(item.status),
            actionLabel: "查看详情",
            onClick: () => navigate("/home/appointment")
        }));
        if (mapped.length < 3) {
            mapped.unshift({
                id: "todo-assessment",
                title: "月度心理健康测评",
                desc: `建议完成时间：${formatDate(new Date())}`,
                status: {text: "待完成", className: "is-warning"},
                actionLabel: "立即完成",
                onClick: () => navigate("/psych_test_entrance")
            });
        }
        return mapped.slice(0, 3);
    }, [navigate, sortedAppointments]);

    return (
        <div className="student-home">
            {loading && (
                <div className="student-home__loading">
                    <Loading type="dots" text="正在加载首页数据..." color="#5b86e5" size="medium"/>
                </div>
            )}
            {errorMessage && <div className="student-home__error">提示：{errorMessage}</div>}

            <section className="student-home__hero">
                <div className="student-home__hero-content">
                    <h2>
                        你好，{user.name || user.nickname || user.username}
                        <span> 关注心理健康，拥抱阳光成长</span>
                    </h2>
                    <p>定期进行心理测评，及时了解自己的心理状态，我们陪伴你健康快乐成长。</p>
                    <div className="student-home__hero-actions">
                        <button type="button" className="btn-solid" onClick={() => navigate("/psych_test_entrance")}>
                            <i className="fa-solid fa-brain"/> 立即测评
                        </button>
                        <button type="button" className="btn-glass" onClick={() => navigate("/home/appointment")}>
                            <i className="fa-solid fa-calendar-plus"/> 预约咨询
                        </button>
                    </div>
                </div>
                <div className="student-home__hero-image">
                    <img src={heroImage2} alt="心理健康插图"/>
                </div>
            </section>

            <section className="student-home__section">
                <h3><i className="fa-solid fa-chart-pie"/> 我的心理状态</h3>
                <div className="student-home__stats">
                    <article className="student-home__stat-card">
                        <p>情绪指数</p>
                        <h4>{moodIndex}<span>/100</span></h4>
                        <small className="is-success">较上周提升 5%</small>
                    </article>
                    <article className="student-home__stat-card">
                        <p>压力指数</p>
                        <h4>{stressIndex}<span>/100</span></h4>
                        <small className="is-warning">建议保持规律作息</small>
                    </article>
                    <article className="student-home__stat-card">
                        <p>本月测评</p>
                        <h4>{assessmentCount}<span>次</span></h4>
                        <small>完成率 100%</small>
                    </article>
                    <article className="student-home__stat-card">
                        <p>咨询次数</p>
                        <h4>{appointments.length}<span>次</span></h4>
                        <small>{pendingAppointments.length > 0 ? `待处理 ${pendingAppointments.length} 次` : "本月预约进行顺利"}</small>
                    </article>
                </div>
            </section>

            <section className="student-home__section">
                <div className="student-home__chart-card">
                    <div className="student-home__chart-header">
                        <h3><i className="fa-solid fa-chart-line"/> 心理状态趋势</h3>
                        <div className="pill-group">
                            <span className="is-active">本月</span>
                            <span>近3月</span>
                            <span>全年</span>
                        </div>
                    </div>
                    <div className="student-home__chart">
                        <svg viewBox="0 0 100 46" preserveAspectRatio="none">
                            <path d={moodArea} className="area mood"/>
                            <path d={stressArea} className="area stress"/>
                            <path d={moodLine} className="line mood"/>
                            <path d={stressLine} className="line stress"/>
                        </svg>
                        <div className="student-home__chart-labels">
                            {["1日", "5日", "10日", "15日", "20日", "25日", "30日"].map((item) => <span key={item}>{item}</span>)}
                        </div>
                        <div className="student-home__chart-legend">
                            <span><i className="dot mood"/> 情绪指数</span>
                            <span><i className="dot stress"/> 压力指数</span>
                        </div>
                    </div>
                </div>
            </section>

            <section className="student-home__section">
                <div className="student-home__section-head">
                    <h3><i className="fa-solid fa-lightbulb"/> 为你推荐</h3>
                    <button type="button" onClick={() => navigate("/psych_knowledge/browse")}>查看更多</button>
                </div>
                <div className="student-home__recommend">
                    {recommendCards.map((item) => (
                        <article key={item.id} className="student-home__recommend-card" onClick={() => navigate(item.path)}>
                            <img src={item.image} alt={item.title}/>
                            <div className="body">
                                <span className="tag">{item.category}</span>
                                <h4>{item.title}</h4>
                                <p>{item.summary}</p>
                                <div className="meta">
                                    <span><i className="fa-solid fa-eye"/> {item.views}</span>
                                    <span>{item.date}</span>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <section className="student-home__section">
                <h3><i className="fa-solid fa-list-check"/> 我的待办</h3>
                <div className="student-home__todo-card">
                    {todoItems.map((item) => (
                        <div key={item.id} className="student-home__todo-item">
                            <div className="todo-main">
                                <strong>{item.title}</strong>
                                <p>{item.desc}</p>
                            </div>
                            <div className="todo-right">
                                <span className={`badge ${item.status.className}`}>{item.status.text}</span>
                                <button type="button" onClick={item.onClick}>{item.actionLabel}</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="student-home__section">
                <h3><i className="fa-solid fa-headset"/> 需要帮助？</h3>
                <div className="student-home__support">
                    <article>
                        <div className="icon mood"><i className="fa-solid fa-headphones-simple"/></div>
                        <h4>24小时心理热线</h4>
                        <p>随时为你提供专业心理支持</p>
                        <strong>400-888-9999</strong>
                    </article>
                    <article>
                        <div className="icon info"><i className="fa-solid fa-comments"/></div>
                        <h4>在线客服</h4>
                        <p>工作日 9:00-18:00 在线解答</p>
                        <button type="button" onClick={() => navigate("/home/community/browse")}>立即咨询</button>
                    </article>
                    <article>
                        <div className="icon success"><i className="fa-solid fa-envelope-open"/></div>
                        <h4>邮箱支持</h4>
                        <p>发送邮件，我们会尽快回复</p>
                        <strong>help@xinqingcampus.com</strong>
                    </article>
                </div>
            </section>

            <footer className="student-home__footer">
                <div className="student-home__footer-grid">
                    <section>
                        <div className="student-home__footer-brand">
                            <span className="footer-brand-icon">
                                <i className="fa-solid fa-heart-pulse"/>
                            </span>
                            <div>
                                <h4>心晴校园</h4>
                                <p>学生心理健康平台</p>
                            </div>
                        </div>
                        <p>专注于学生心理健康服务，助力青少年健康快乐成长。</p>
                        <div className="student-home__footer-social">
                            <button type="button" aria-label="微信"><i className="fa-brands fa-weixin"/></button>
                            <button type="button" aria-label="微博"><i className="fa-brands fa-weibo"/></button>
                            <button type="button" aria-label="QQ"><i className="fa-brands fa-qq"/></button>
                        </div>
                    </section>

                    <section>
                        <h5>服务导航</h5>
                        <button type="button" onClick={() => navigate("/psych_test_entrance")}>心理测评</button>
                        <button type="button" onClick={() => navigate("/home/appointment")}>预约咨询</button>
                        <button type="button" onClick={() => navigate("/psych_knowledge/browse")}>心理百科</button>
                        <button type="button" onClick={() => navigate("/home/community/browse")}>心理树洞</button>
                    </section>

                    <section>
                        <h5>关于我们</h5>
                        <button type="button" onClick={() => navigate("/home/main")}>平台介绍</button>
                        <button type="button" onClick={() => navigate("/home/main")}>专业团队</button>
                        <button type="button" onClick={() => navigate("/home/main")}>合作伙伴</button>
                        <button type="button" onClick={() => navigate("/home/main")}>联系我们</button>
                    </section>

                    <section>
                        <h5>法律信息</h5>
                        <button type="button" onClick={() => navigate("/home/main")}>隐私政策</button>
                        <button type="button" onClick={() => navigate("/home/main")}>用户协议</button>
                        <button type="button" onClick={() => navigate("/home/main")}>免责声明</button>
                        <button type="button" onClick={() => navigate("/home/main")}>版权信息</button>
                    </section>
                </div>
                <div className="student-home__footer-bottom">
                    © 2026 心晴校园 版权所有 | 京ICP备12345678号 | 京公网安备11010802030123号
                </div>
            </footer>
        </div>
    );
};
