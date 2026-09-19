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

        alert("Account created! Check your email to verify your account.");
        signupForm.reset();
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
