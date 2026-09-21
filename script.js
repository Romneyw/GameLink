(function () {
    "use strict";

    console.log("GameLink script v8 loaded");

    const signupForm = document.getElementById("signup-form");
    const loginForm = document.getElementById("login-form");

    const dashboardStatus = document.getElementById("dashboard-status");
    const dashboardDetails = document.getElementById("dashboard-details");
    const dashboardRetry = document.getElementById("dashboard-retry");
    const logoutButton = document.getElementById("logout-button");

    const resetForm = document.getElementById("reset-password-form");
    const resetStatus = document.getElementById("reset-status");
    const resetButton = resetForm
        ? resetForm.querySelector('button[type="submit"]')
        : null;

    const isHomepage = Boolean(document.querySelector(".hero"));
    const homeNav = isHomepage
        ? document.querySelector("header .nav-buttons")
        : null;

    let client;
    let recoveryReady = false;

    function goTo(page) {
        window.location.href = page;
    }

    function makeNavButton(label, className, action) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = className;
        button.textContent = label;
        button.addEventListener("click", action);
        return button;
    }

    function renderHomeNav(session) {
        if (!homeNav) return;

        homeNav.replaceChildren();

        if (session) {
            homeNav.append(
                makeNavButton("My Profile", "login", function () {
                    goTo("dashboard.html");
                }),
                makeNavButton("Logout", "signup", function (event) {
                    logout(event.currentTarget);
                })
            );
        } else {
            homeNav.append(
                makeNavButton("Login", "login", function () {
                    goTo("login.html");
                }),
                makeNavButton("Sign Up", "signup", function () {
                    goTo("signup.html");
                })
            );
        }
    }

    // Keep account navigation usable while checking the session.
    if (homeNav) {
        homeNav.replaceChildren(
            makeNavButton("My Account", "login", function () {
                goTo("dashboard.html");
            })
        );
    }

    document.querySelectorAll("[data-coming-soon]").forEach(function (button) {
        button.addEventListener("click", function () {
            alert(button.dataset.comingSoon + " is coming soon.");
        });
    });

    if (!window.supabase) {
        const message =
            "Could not connect to GameLink. Check your connection and refresh.";

        if (dashboardStatus) dashboardStatus.textContent = message;
        if (resetStatus) resetStatus.textContent = message;
        if (dashboardRetry) {
            dashboardRetry.hidden = false;
            dashboardRetry.onclick = function () {
                window.location.reload();
            };
        }

        alert(message);
        return;
    }

    client = window.supabase.createClient(
        "https://arlhkjocegnppfziikpo.supabase.co",
        "sb_publishable_aWWQyhe1KrXskToB9nU2_A_SsFpUPbv"
    );

    // Prevent read operations from displaying an endless loading message.
    async function readWithTimeout(request) {
        let timer;

        try {
            return await Promise.race([
                request,
                new Promise(function (_, reject) {
                    timer = setTimeout(function () {
                        reject(new Error(
                            "The connection is taking too long. Please try again."
                        ));
                    }, 12000);
                })
            ]);
        } finally {
            clearTimeout(timer);
        }
    }

    // No asynchronous Supabase calls inside this callback.
    client.auth.onAuthStateChange(function (event, session) {
        renderHomeNav(session);

        if (event === "SIGNED_OUT") {
            recoveryReady = false;

            if (resetButton) {
                resetButton.disabled = true;
                resetStatus.textContent =
                    "Please open a new password-reset link from your email.";
            }

            if (dashboardDetails) {
                dashboardDetails.hidden = true;
                window.location.replace("login.html");
            }
        }

        if (event === "PASSWORD_RECOVERY" && session && resetButton) {
            recoveryReady = true;
            resetButton.disabled = false;
            resetStatus.textContent = "Enter your new password.";
        }
    });

    // HOMEPAGE

    if (homeNav) {
        readWithTimeout(client.auth.getSession())
            .then(function ({ data, error }) {
                if (error) throw error;
                renderHomeNav(data.session);
            })
            .catch(function (error) {
                console.error("Account check failed:", error.message);
                // My Account remains usable if the check fails.
            });
    }

    // SIGNUP: new players go to gamer setup.

    if (signupForm) {
        const button = signupForm.querySelector('button[type="submit"]');
        button.disabled = false;

        signupForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const username = signupForm.querySelector("#username").value.trim();
            const email = signupForm.querySelector("#email").value.trim();
            const password = signupForm.querySelector("#password").value;

            if (!username) {
                alert("Please enter a gamer name.");
                return;
            }

            button.disabled = true;
            button.textContent = "Creating account…";

            try {
                const { data, error } = await client.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { username: username }
                    }
                });

                if (error) throw error;

                if (data.session) {
                    window.location.replace("setup-profile.html");
                } else {
                    alert("Check your email to confirm your account, then log in.");
                }
            } catch (error) {
                alert("Signup failed: " + error.message);
            } finally {
                button.disabled = false;
                button.textContent = "Create Account →";
            }
        });
    }

    // LOGIN: the dashboard checks whether gamer setup is complete.

    if (loginForm) {
        const button = loginForm.querySelector('button[type="submit"]');
        button.disabled = false;

        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            button.disabled = true;
            button.textContent = "Logging in…";

            try {
                const { data, error } = await client.auth.signInWithPassword({
                    email: loginForm.querySelector("#email").value.trim(),
                    password: loginForm.querySelector("#password").value
                });

                if (error) throw error;
                if (!data.session) throw new Error("Please try logging in again.");

                window.location.replace("dashboard.html");
            } catch (error) {
                alert("Login failed: " + error.message);
            } finally {
                button.disabled = false;
                button.textContent = "Login →";
            }
        });
    }

    // DASHBOARD: show saved profile or send the player to setup.

    async function loadDashboard() {
        dashboardDetails.hidden = true;
        dashboardRetry.hidden = true;
        dashboardStatus.textContent = "Loading your gamer profile…";

        try {
            const { data: sessionData, error: sessionError } =
                await readWithTimeout(client.auth.getSession());

            if (sessionError) throw sessionError;

            if (!sessionData.session) {
                window.location.replace("login.html");
                return;
            }

            const { data: authData, error: authError } =
                await readWithTimeout(client.auth.getUser());

            if (authError) throw authError;

            if (!authData.user) {
                window.location.replace("login.html");
                return;
            }

            const { data: profile, error: profileError } =
                await readWithTimeout(
                    client.from("profiles")
                        .select("gamer_name, country, language, bio, game_ranks")
                        .eq("id", authData.user.id)
                        .maybeSingle()
                );

            if (profileError) throw profileError;

            if (
                !profile ||
                !profile.gamer_name ||
                !profile.country ||
                !profile.language ||
                !profile.game_ranks ||
                Object.keys(profile.game_ranks).length === 0
            ) {
                window.location.replace("setup-profile.html");
                return;
            }

            document.getElementById("welcome-message").textContent =
                "Welcome, " + profile.gamer_name + "!";

            document.getElementById("profile-location").textContent =
                profile.country + " • " + profile.language;

            document.getElementById("profile-bio").textContent =
                profile.bio || "";

            const gamesContainer = document.getElementById("player-games");
            gamesContainer.replaceChildren();

            Object.entries(profile.game_ranks).forEach(function ([game, rank]) {
                const card = document.createElement("article");
                card.className = "player-game";

                const title = document.createElement("h3");
                title.textContent = game;

                const description = document.createElement("p");
                description.textContent =
                    (game === "Minecraft" ? "Experience: " : "Rank: ") + rank;

                card.append(title, description);
                gamesContainer.append(card);
            });

            dashboardStatus.textContent = "";
            dashboardDetails.hidden = false;
        } catch (error) {
            dashboardStatus.textContent =
                "Could not load your profile: " + error.message;
            dashboardRetry.hidden = false;
        }
    }

    if (dashboardDetails) {
        loadDashboard();

        dashboardRetry.addEventListener("click", loadDashboard);
    }

    // LOGOUT

    async function logout(button) {
        const oldText = button.textContent;
        button.disabled = true;
        button.textContent = "Logging out…";

        try {
            const { error } = await client.auth.signOut();
            if (error) throw error;

            if (dashboardDetails) {
                window.location.replace("login.html");
            } else {
                renderHomeNav(null);
            }
        } catch (error) {
            alert("Logout failed: " + error.message);
        } finally {
            button.disabled = false;
            button.textContent = oldText;
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            logout(logoutButton);
        });
    }

    // EXISTING PASSWORD-RESET PAGE

    if (resetForm && resetButton && resetStatus) {
        resetStatus.textContent =
            "Open this page using the password-reset link in your email.";

        resetForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!recoveryReady) {
                resetStatus.textContent =
                    "Please open a fresh password-reset link from your email.";
                return;
            }

            const password = document.getElementById("new-password").value;
            const confirmation =
                document.getElementById("confirm-password").value;

            if (password.length < 8) {
                resetStatus.textContent = "Use at least 8 characters.";
                return;
            }

            if (password !== confirmation) {
                resetStatus.textContent = "The passwords do not match.";
                return;
            }

            resetButton.disabled = true;
            resetButton.textContent = "Updating…";

            try {
                const { error } = await client.auth.updateUser({
                    password: password
                });

                if (error) throw error;

                recoveryReady = false;
                resetForm.reset();
                resetStatus.textContent =
                    "Password updated! You can now log in with it.";
            } catch (error) {
                resetStatus.textContent = error.message;
            } finally {
                resetButton.disabled = !recoveryReady;
                resetButton.textContent = "Update Password →";
            }
        });
    }
})();
