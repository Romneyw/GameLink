(function () {
    "use strict";
    const $ = id => document.getElementById(id);
    let client = null;
    let session = null;
    let checked = false;
    let sessionRevision = 0;
    let navigating = false;

    function renderNavigation() {
        const signedIn = Boolean(session);
        $("home-login").hidden = signedIn;
        $("home-signup").hidden = signedIn;
        $("home-profile").hidden = !signedIn;
        $("home-logout").hidden = !signedIn;
    }
    async function timed(request) {
        let timer;
        try {
            return await Promise.race([
                request,
                new Promise((_,reject) => {timer = setTimeout(() => reject(new Error("Account check took too long. Please try again.")), 8000);})
            ]);
        } finally {clearTimeout(timer);}
    }
    async function checkSession() {
        if (!client) throw new Error("Could not load GameLink. Refresh the page, or use Login above.");
        const revision = sessionRevision;
        const result = await timed(client.auth.getSession());
        if (result.error) throw result.error;
        if (revision === sessionRevision) {
            session = result.data.session;
            checked = true;
            renderNavigation();
        }
    }
    if (window.supabase) {
        client = window.supabase.createClient(
            "https://arlhkjocegnppfziikpo.supabase.co",
            "sb_publishable_aWWQyhe1KrXskToB9nU2_A_SsFpUPbv"
        );
        client.auth.onAuthStateChange((_event, currentSession) => {
            sessionRevision++;
            session = currentSession;
            checked = true;
            renderNavigation();
        });
    }
    // Start checking immediately; Login and Sign Up always remain usable.
    let initialCheck = checkSession().catch(error => {
        $("home-status").textContent = error.message;
    }).finally(() => { initialCheck = null; });

    async function openFeature(destination) {
        if (navigating) return;
        navigating = true;
        try {
            if (!checked) {
                $("home-status").textContent = "Checking your account…";
                if (initialCheck) {
                    await initialCheck;
                    if (!checked) throw new Error($("home-status").textContent || "Could not check your account. Please try again.");
                } else {
                    await checkSession();
                }
            }
            $("home-status").textContent = "";
            if (!session) {
                window.location.href = "login.html";
                return;
            }
            // All destinations are local, explicitly authored feature links.
            if (destination === "#games") {
                document.getElementById("games").scrollIntoView({behavior:"smooth"});
            } else {
                const target = new URL(destination, window.location.href);
                if (target.origin !== window.location.origin) throw new Error("Invalid GameLink link.");
                window.location.href = target.href;
            }
        } catch (error) {
            $("home-status").textContent = error.message || "Could not open this feature. Please try again.";
        } finally {navigating = false;}
    }
    document.addEventListener("click", event => {
        const control = event.target.closest("[data-destination]");
        if (!control) return;
        event.preventDefault();
        void openFeature(control.dataset.destination);
    });
    document.addEventListener("keydown", event => {
        if (event.key !== "Enter" && event.key !== " ") return;
        const card = event.target.closest('.game-card[data-destination]');
        if (!card || event.target !== card) return;
        event.preventDefault();
        void openFeature(card.dataset.destination);
    });
    $("home-logout").addEventListener("click", async () => {
        if (!client) return;
        $("home-logout").disabled = true;
        try {
            const result = await timed(client.auth.signOut());
            if (result.error) throw result.error;
            session = null; checked = true; sessionRevision++;
            renderNavigation(); $("home-status").textContent = "You have logged out.";
        } catch(error) {$("home-status").textContent = "Could not log out: " + error.message;}
        finally {$("home-logout").disabled = false;}
    });
    window.addEventListener("pageshow", event => {
        if (event.persisted) {checked=false; initialCheck=checkSession().catch(error=>{$("home-status").textContent=error.message;}).finally(()=>{initialCheck=null;});}
    });
})();
