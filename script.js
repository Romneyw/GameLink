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
