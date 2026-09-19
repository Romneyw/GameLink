const SUPABASE_URL = "https://arlhkjocegnppfziikpo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_aWWQyhe1KrXskToB9nU2_A_SsFpUPbv";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("GameLink connected to Supabase!");
