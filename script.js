console.log("GameLink script v7 loaded");

const SUPABASE_URL = "https://arlhkjocegnppfziikpo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_aWWQyhe1KrXskToB9nU2_A_SsFpUPbv";

// Show a clear message for features that are not built yet.
document.querySelectorAll("[data-coming-soon]").forEach(function (button) {
    button.addEventListener("click", function () {
        alert(button.dataset.comingSoon + " is coming soon.");
    });
});

if (!window.supabase) {
    alert("GameLink could not load. Check your connection and refresh.");
} else {
    const supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    const signupForm = document.getElementById("signup-form");
    const loginForm = document.getElementById("login-form");
    const welcomeMessage = document.getElementById("welcome-message");
    const logoutButton = document.getElementById("logout-button");

    const homeAccountButton =
        document.getElementById("home-account-button");
    const homeAuthButton =
        document.getElementById("home-auth-button");

    const resetForm = document.getElementById("reset-password-form");
    const resetStatus = document.getElementById("reset-status");
    const resetButton = resetForm
        ? resetForm.querySelector('button[type="submit"]')
        : null;

    let homeSignedIn = false;
    let recoveryReady = false;

    // HOMEPAGE BUTTONS

    function updateHomeButtons(session) {
        if (!homeAccountButton || !homeAuthButton) return;

        homeSignedIn = Boolean(session);

        homeAccountButton.textContent =
            homeSignedIn ? "Dashboard" : "Login";

        homeAuthButton.textContent =
            homeSignedIn ? "Logout" : "Sign Up";

        homeAccountButton.disabled = false;
        homeAuthButton.disabled = false;
    }

    if (resetStatus) {
        resetStatus.textContent =
            "Open this page using the password-reset link in your email.";
    }

    // Listen for initial session, login, logout and recovery events.
    // Keep this callback synchronous.
    supabaseClient.auth.onAuthStateChange(function (event, session) {
        updateHomeButtons(session);

        if (event === "SIGNED_OUT") {
            recoveryReady = false;

            if (resetButton) {
                resetButton.disabled = true;
                resetStatus.textContent =
                    "Please request a new password-reset email.";
            }

            if (welcomeMessage) {
                window.location.replace("login.html");
            }
        }

        if (event === "PASSWORD_RECOVERY" && session && resetButton) {
            recoveryReady = true;
            resetButton.disabled = false;
            resetStatus.textContent = "Enter your new password below.";
        }
    });

    if (homeAccountButton && homeAuthButton) {
        homeAccountButton.addEventListener("click", function () {
            window.location.href = homeSignedIn
                ? "dashboard.html"
                : "login.html";
        });

        homeAuthButton.addEventListener("click", async function () {
            if (!homeSignedIn) {
                window.location.href = "signup.html";
                return;
            }

            await logout(homeAuthButton, false);
        });
    }

    // SIGNUP

    if (signupForm) {
        const signupButton =
            signupForm.querySelector('button[type="submit"]');

        signupForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const username =
                signupForm.querySelector("#username").value.trim();
            const email =
                signupForm.querySelector("#email").value.trim();
            const password =
                signupForm.querySelector("#password").value;

            if (!username) {
                alert("Please enter a username.");
                return;
            }

            signupButton.disabled = true;
            signupButton.textContent = "Creating account…";

            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: { username: username }
                    }
                });

                if (error) {
                    alert("Signup failed: " + error.message);
                    return;
                }

                signupForm.reset();

                if (data.session) {
                    window.location.replace("dashboard.html");
                } else {
                    alert(
                        "Check your email and confirm your account before logging in."
                    );
                }
            } catch (error) {
                alert("Unable to sign up. Check your connection and try again.");
            } finally {
                signupButton.disabled = false;
                signupButton.textContent = "Create Account →";
            }
        });
    }

    // LOGIN

    if (loginForm) {
        const loginButton =
            loginForm.querySelector('button[type="submit"]');

        loginButton.disabled = false;

        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email =
                loginForm.querySelector("#email").value.trim();
            const password =
                loginForm.querySelector("#password").value;

            loginButton.disabled = true;
            loginButton.textContent = "Logging in…";

            try {
                const { data, error } =
                    await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password
                    });

                if (error) {
                    alert("Login failed: " + error.message);
                    return;
                }

                if (!data.session) {
                    alert("Login did not complete. Please try again.");
                    return;
                }

                window.location.replace("dashboard.html");
            } catch (error) {
                alert("Unable to log in. Check your connection and try again.");
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = "Login →";
            }
        });
    }

    // DASHBOARD

    if (welcomeMessage) {
        loadDashboard();
    }

    async function loadDashboard() {
        try {
            const { data, error } = await supabaseClient.auth.getUser();

            if (error || !data.user) {
                window.location.replace("login.html");
                return;
            }

            const username =
                data.user.user_metadata?.username || "Gamer";

            welcomeMessage.textContent =
                "Welcome, " + username + "! Your squad is waiting.";
        } catch (error) {
            welcomeMessage.textContent =
                "Unable to load your account. Please refresh the page.";
        }
    }

    // LOGOUT

    async function logout(button, redirectToLogin) {
        const previousText = button.textContent;
        button.disabled = true;
        button.textContent = "Logging out…";

        try {
            const { error } = await supabaseClient.auth.signOut();

            if (error) {
                alert("Logout failed: " + error.message);
                button.textContent = previousText;
                return;
            }

            updateHomeButtons(null);

            if (redirectToLogin) {
                window.location.replace("login.html");
            }
        } catch (error) {
            button.textContent = previousText;
            alert("Unable to log out. Check your connection and try again.");
        } finally {
            button.disabled = false;
        }
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            logout(logoutButton, true);
        });
    }

    // PASSWORD RESET

    if (resetForm && resetButton && resetStatus) {
        resetForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            if (!recoveryReady) {
                resetStatus.textContent =
                    "Please open a fresh password-reset link from your email.";
                return;
            }

            const password =
                document.getElementById("new-password").value;
            const confirmation =
                document.getElementById("confirm-password").value;

            if (password.length < 8) {
                resetStatus.textContent =
                    "Use a password with at least 8 characters.";
                return;
            }

            if (password !== confirmation) {
                resetStatus.textContent = "The passwords do not match.";
                return;
            }

            resetButton.disabled = true;
            resetButton.textContent = "Updating…";

            try {
                const { error } = await supabaseClient.auth.updateUser({
                    password: password
                });

                if (error) {
                    resetStatus.textContent = error.message;
                    return;
                }

                recoveryReady = false;
                resetForm.reset();

                resetStatus.textContent =
                    "Password updated! Use Back to Login to log in with it.";
            } catch (error) {
                resetStatus.textContent =
                    "Unable to update your password. Check your connection.";
            } finally {
                resetButton.disabled = !recoveryReady;
                resetButton.textContent = "Update Password →";
            }
        });
    }
}
