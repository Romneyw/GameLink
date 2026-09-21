console.log("GAMELINK SCRIPT IS WORKING!");
const SUPABASE_URL = "https://arlhkjocegnppfziikpo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aWWQyhe1KrXskToB9nU2_A_SsFpUPbv";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

const signupForm = document.getElementById("signup-form");

if (signupForm) {
    signupForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const { data, error } = await supabaseClient.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username
                }
            }
        });

        if (error) {
            alert("Signup failed: " + error.message);
            return;
        }

       alert("Account created! Welcome to GameLink.");
signupForm.reset();
window.location.href = "dashboard.html";
    });
}
const loginForm = document.getElementById("login-form");

if (loginForm) {
    const loginButton = loginForm.querySelector('button[type="submit"]');

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";

        try {
            const { error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                alert("Login failed: " + error.message);
                return;
            }

            alert("Login successful! Welcome to GameLink.");
            window.location.href = "index.html";
        } catch (error) {
            alert("Unable to log in. Check your connection and try again.");
        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "Login →";
        }
    });

    loginButton.disabled = false;
}
const resetForm = document.getElementById("reset-password-form");

if (resetForm) {
    const resetButton = resetForm.querySelector('button[type="submit"]');
    const resetStatus = document.getElementById("reset-status");
    let recoveryReady = false;

    resetStatus.textContent =
        "Open this page using the password-reset link in your email.";

    supabaseClient.auth.onAuthStateChange(function (event, session) {
        if (event === "PASSWORD_RECOVERY" && session) {
            recoveryReady = true;
            resetButton.disabled = false;
            resetStatus.textContent = "Enter your new password below.";
        }

        if (event === "SIGNED_OUT") {
            recoveryReady = false;
            resetButton.disabled = true;
            resetStatus.textContent =
                "Please request a new password-reset email.";
        }
    });

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

        if (password !== confirmation) {
            resetStatus.textContent = "The passwords do not match.";
            return;
        }

        resetButton.disabled = true;
        resetButton.textContent = "Updating...";

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
