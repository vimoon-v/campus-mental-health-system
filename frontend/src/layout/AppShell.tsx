import React from "react";
import { MainTopNav, MainTopNavProps } from "./MainTopNav";

interface AppShellProps extends MainTopNavProps {
    children: React.ReactNode;
    mainPadding?: string;
    useContainer?: boolean;
    showTopNav?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
	                                                      children,
	                                                      username,
	                                                      accountUsername,
	                                                      avatar,
	                                                      role,
                                                      mainPadding = "30px 0",
                                                      useContainer = true,
                                                      showTopNav = true,
                                                  }) => {
    return (
        <div className="counseling-platform landing-page landing-shell">
            {showTopNav && (
                <MainTopNav
                    username={username ?? undefined}
                    accountUsername={accountUsername ?? undefined}
                    avatar={avatar ?? undefined}
                    role={role ?? undefined}
                />
            )}

            <main style={{ padding: mainPadding }}>
                {useContainer ? (
                    <div className="container">{children}</div>
                ) : (
                    children
                )}
            </main>
        </div>
    );
};
