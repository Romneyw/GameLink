(function () {
    "use strict";
    const $ = id => document.getElementById(id);
    const peer = new URLSearchParams(location.search).get("player");
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    $("app").dataset.view = peer ? "chat" : "inbox";
    const records = new Map();
    document.body.classList.toggle("chat-view",Boolean(peer));
    let notifications=null, unread=new Map(), marking=false;
    let client, me, ready = false, starting = false, stopped = false;
    let loadingChat = false, loadingInbox = false, sending = false;
    let initialLoaded = false, moreHistory = false, inboxPage = 0, pending = null;
    let newest = null, oldest = null;
    function element(tag, value, className) {
        const el = document.createElement(tag);
        el.textContent = value;
        if (className) el.className = className;
        return el;
    }
    function explain(error) {
        if (error.code === "PGRST202" || error.code === "42P01")
            return "Chat setup needs updating. Run chat-notifications.sql in Supabase, then refresh.";
        return error.message || "Connection failed. Please try again.";
    }
    async function request(query) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
            const result = await query.abortSignal(controller.signal);
            if (result.error) throw result.error;
            return result.data;
        } catch (error) {
            if (controller.signal.aborted) throw new Error("Connection took too long. Please try again.");
            throw error;
        } finally { clearTimeout(timeout); }
    }
    async function authUser() {
        let timer;
        try {
            const result = await Promise.race([
                client.auth.getUser(),
                new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("Account check took too long. Tap Try Again.")), 15000); })
            ]);
            if (result.error?.name === "AuthSessionMissingError") { location.replace(peer && uuid.test(peer) ? "chat-login.html?player=" + encodeURIComponent(peer) : "login.html"); return null; }
            if (result.error) throw result.error;
            if (!result.data.user) { location.replace(peer && uuid.test(peer) ? "chat-login.html?player=" + encodeURIComponent(peer) : "login.html"); return null; }
            return result.data.user;
        } finally { clearTimeout(timer); }
    }
    function sortedRecords() {
        return [...records.values()].sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
    }
    function renderMessages(forceBottom = false) {
        const box = $("messages");
        const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 100;
        const rows = sortedRecords();
        box.replaceChildren();
        if (!rows.length) box.append(element("p", "No messages yet. Say hello!", "empty"));
        let lastDay="";
        for (const row of rows) {
            const day=new Date(row.created_at).toLocaleDateString([], {weekday:"short",month:"short",day:"numeric"});
            if(day!==lastDay){box.append(element("div",day,"day-divider"));lastDay=day;}
            const bubble = element("article", "", "bubble" + (row.sender_id === me.id ? " mine" : ""));
            bubble.setAttribute("aria-label", row.sender_id === me.id ? "You" : $("chat-name").textContent);
            const time = element("time", new Date(row.created_at).toLocaleString([], {hour:"2-digit",minute:"2-digit"}));
            time.dateTime = row.created_at;
            bubble.append(element("p", row.body), time);
            box.append(bubble);
        }
        if (forceBottom || nearBottom) box.scrollTop = box.scrollHeight;
        else if(rows.length) $("new-messages").hidden=false;
    }
    async function loadChat(older = false) {
        if (!ready || !peer || loadingChat || stopped) return;
        loadingChat = true;
        $("older").disabled = true;
        const box = $("messages");
        const previousHeight = box.scrollHeight, previousTop = box.scrollTop;
        const first = !initialLoaded;
        try {
            const args = {p_peer: peer};
            if (older && oldest) {
                args.p_before_time = oldest.created_at; args.p_before_id = oldest.id;
            } else if (newest) {
                args.p_after_time = newest.created_at; args.p_after_id = newest.id;
            }
            const rows = await request(client.rpc("gamelink_chat_history", args));
            if (stopped) return;
            rows.forEach(row => records.set(row.id, row));
            // Advance the polling cursor only from fetched history, never a send response.
            const ascending = [...rows].sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
            if (!older && ascending.length) newest = ascending[ascending.length - 1];
            if ((first || older) && ascending.length) oldest = ascending[0];
            if (first || older) moreHistory = rows.length === 50;
            initialLoaded = true;
            if (rows.length || first) renderMessages(first);
            if (older) box.scrollTop = previousTop + box.scrollHeight - previousHeight;
            $("older").hidden = !moreHistory;
            $("chat-status").textContent = "";
            void markVisibleRead();
        } catch (error) {
            $("chat-status").textContent = explain(error);
        } finally { loadingChat = false; $("older").disabled = false; }
    }
    async function loadInbox() {
        if (!me || loadingInbox || stopped) return;
        loadingInbox = true;
        $("prev-inbox").disabled = true; $("next-inbox").disabled = true;
        try {
            const rows = await request(client.rpc("gamelink_inbox", {p_offset: inboxPage * 20}));
            const visible = rows.slice(0,20);
            const names = new Map();
            if (visible.length) {
                const profiles = await request(client.from("profiles").select("id,gamer_name").in("id",visible.map(row => row.peer_id)));
                profiles.forEach(p => names.set(p.id,p.gamer_name));
            }
            if (stopped) return;
            const fragment = document.createDocumentFragment();
            for (const row of visible) {
                const link = element("a", "", "thread" + (row.peer_id === peer ? " active" : ""));
                link.href = "chat.html?player=" + encodeURIComponent(row.peer_id);
                const name=names.get(row.peer_id)||"Gamer";
                const avatar=element("span",initials(name),"avatar");avatar.setAttribute("aria-hidden","true");
                const copy=element("span","","thread-copy");copy.append(element("strong",name),element("small",row.body));
                const meta=element("span","","thread-meta");const time=element("time",new Date(row.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}));time.dateTime=row.created_at;meta.append(time);
                const count=element("span","","thread-count");count.dataset.unreadPeer=row.peer_id;count.hidden=true;meta.append(count);link.dataset.peer=row.peer_id;link.append(avatar,copy,meta);
                link.setAttribute("aria-label", "Open chat with " + (names.get(row.peer_id) || "Gamer"));
                fragment.append(link);
            }
            // Avoid replacing a focused link during an automatic refresh.
            if (!$("threads").contains(document.activeElement)) $("threads").replaceChildren(fragment);
            $("inbox-status").textContent = visible.length ? "Tap a player to open your chat." : "No conversations here yet. Find a teammate and say hello.";
            $("prev-inbox").hidden = inboxPage === 0;
            $("next-inbox").hidden = rows.length <= 20;
            paintUnread();
        } catch (error) { $("inbox-status").textContent = explain(error); }
        finally { loadingInbox = false; $("prev-inbox").disabled = false; $("next-inbox").disabled = false; }
    }
    async function start() {
        if (starting) return;
        starting = true; $("retry-account").hidden = true;
        $("account-status").textContent = "Checking your account…";
        try {
            if (!window.supabase) throw new Error("Could not load GameLink. Refresh this page to retry.");
            if (!client) {
                client = window.supabase.createClient("https://arlhkjocegnppfziikpo.supabase.co", "sb_publishable_aWWQyhe1KrXskToB9nU2_A_SsFpUPbv");
                client.auth.onAuthStateChange(event => {
                    if (event === "SIGNED_OUT") {
                        stopped = true; ready = false; records.clear();
                        $("messages").replaceChildren(); $("threads").replaceChildren();
                        $("app").hidden = true; location.replace(peer && uuid.test(peer) ? "chat-login.html?player=" + encodeURIComponent(peer) : "login.html");
                    }
                });
            }
            me = await authUser();
            if (!me || stopped) return;
            $("app").hidden = false;
            if (peer) {
                if (!uuid.test(peer)) throw new Error("This chat link is invalid. Open Find Teammates and choose Chat.");
                if (peer === me.id) throw new Error("Choose another player to start a conversation.");
                let profile = await request(client.from("profiles").select("gamer_name,country,language").eq("id",peer).maybeSingle());
                if (!profile) {
                    const published = await request(client.from("gamelink_public_cards").select("card").eq("id",peer).maybeSingle());
                    if (published) profile = {gamer_name: published.card?.values?.["gamer-name"] || "Gamer", language: published.card?.values?.language || ""};
                    else {
                        const history = await request(client.rpc("gamelink_chat_history", {p_peer:peer}));
                        if (history.length) profile = {gamer_name:"Gamer"};
                    }
                }
                if (!profile) throw new Error("This player profile is unavailable. Choose another teammate.");
                $("chat-name").textContent = profile.gamer_name;
                $("chat-avatar").textContent=initials(profile.gamer_name);
                $("chat-detail").textContent = [profile.country,profile.language].filter(Boolean).join(" • ") || "Private conversation";
                $("composer").hidden = false;
            }
            ready = true; $("account-status").textContent = "";
            if(!notifications&&window.GameLinkNotifications)notifications=window.GameLinkNotifications.start(client,{isViewing:id=>id===peer&&atBottom()&&document.hasFocus()&&!document.hidden});
            await Promise.all([loadInbox(),loadChat()]);
        } catch (error) {
            $("account-status").textContent = explain(error); $("retry-account").hidden = false;
        } finally { starting = false; }
    }
    $("composer").addEventListener("submit", async event => {
        event.preventDefault();
        if (!ready || !peer || sending || stopped) return;
        const body = $("message").value.trim();
        if (!body || body.length > 2000) { $("send-status").textContent = "Write a message between 1 and 2,000 characters."; return; }
        if (!pending) pending = {id:crypto.randomUUID(),sender_id:me.id,receiver_id:peer,body};
        sending = true; $("send").disabled = true; $("message").readOnly = true;
        $("send").textContent = "Sending…"; $("send-status").textContent = "";
        try {
            let row;
            try {
                row = await request(client.from("messages").insert(pending).select("id,sender_id,receiver_id,body,created_at").single());
            } catch (error) {
                // A timed-out request might have succeeded. Retrying uses the same ID.
                if (error.code !== "23505") throw error;
                row = await request(client.from("messages").select("id,sender_id,receiver_id,body,created_at").eq("id",pending.id).single());
                if (row.sender_id !== me.id || row.receiver_id !== peer || row.body !== pending.body) throw new Error("Could not confirm this message. Refresh the page.");
            }
            if (stopped) return;
            records.set(row.id,row); pending = null;
            $("message").value = "";$("message").style.height="auto"; $("send-status").textContent = "Sent.";
            renderMessages(true); void loadInbox(); void loadChat();
        } catch (error) {
            $("send-status").textContent = explain(error) + " Your message is kept here. Tap Retry send to check or resend it.";
        } finally {
            sending = false; $("send").disabled = false;
            $("message").readOnly = Boolean(pending);
            $("send").textContent = pending ? "Retry send" : "Send →";
        }
    });
    $("refresh-inbox").addEventListener("click", () => { void loadInbox(); });
    $("retry-account").addEventListener("click", start);
    $("older").addEventListener("click", () => loadChat(true));
    $("refresh").addEventListener("click", () => { void loadInbox(); void loadChat(); });
    $("prev-inbox").addEventListener("click", () => { if (!loadingInbox && inboxPage > 0) {inboxPage--; void loadInbox();} });
    $("next-inbox").addEventListener("click", () => { if (!loadingInbox) {inboxPage++; void loadInbox();} });
    const poll = setInterval(() => { if (!document.hidden && !stopped && ready) {void loadChat(); void loadInbox();} },5000);
    document.addEventListener("visibilitychange", () => {if (!document.hidden && ready) {void loadChat(); void loadInbox();}});
    window.addEventListener("pagehide", () => clearInterval(poll), {once:true});
    window.addEventListener("pageshow", event => {if (event.persisted) location.reload();});

    function initials(name){return String(name||"Gamer").trim().split(/\s+/).slice(0,2).map(s=>Array.from(s)[0]||"").join("").toUpperCase();}
    function atBottom(){const b=$("messages");return b.scrollHeight-b.scrollTop-b.clientHeight<80;}
    function paintUnread(){document.querySelectorAll("[data-unread-peer]").forEach(el=>{const n=unread.get(el.dataset.unreadPeer)||0;el.textContent=n>99?"99+":String(n);el.hidden=!n;el.setAttribute("aria-label",n+" unread messages");el.closest(".thread").classList.toggle("unread",n>0);});}
    document.addEventListener("gamelink-unread",e=>{if(e.detail.error)return;unread=new Map(e.detail.threads.map(t=>[t.peer_id,Number(t.unread_count)]));paintUnread();});
    async function markVisibleRead(){
        if(marking||!ready||!initialLoaded||!peer||stopped||document.hidden||!document.hasFocus()||!atBottom())return;
        const ids=sortedRecords().filter(r=>r.receiver_id===me.id&&!r.read_at).map(r=>r.id).slice(0,100);
        if(!ids.length)return;marking=true;
        try{await request(client.rpc("gamelink_mark_read",{p_message_ids:ids}));if(stopped)return;ids.forEach(id=>{const row=records.get(id);if(row)row.read_at="read";});void notifications?.refresh();}
        catch(e){$("chat-status").textContent="Messages loaded, but unread status could not update. "+explain(e);}
        finally{marking=false;}
    }
    $("messages").addEventListener("scroll",()=>{if(atBottom()){$("new-messages").hidden=true;void markVisibleRead();}});
    $("new-messages").addEventListener("click",()=>{$("messages").scrollTop=$("messages").scrollHeight;$("new-messages").hidden=true;void markVisibleRead();});
    window.addEventListener("focus",()=>{void markVisibleRead();});
    $("message").addEventListener("input",()=>{$("message").style.height="auto";$("message").style.height=Math.min(120,$("message").scrollHeight)+"px";});
    function sizeViewport(){document.documentElement.style.setProperty("--viewport-height",(window.visualViewport?.height||window.innerHeight)+"px");}
    window.visualViewport?.addEventListener("resize",sizeViewport);sizeViewport();

    void start();
})();