import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase & Resend
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/api/join', async (req, res) => {
    const { firstName, lastName, email, profession, company, platforms, turnstileToken, referredBy } = req.body;

    if (!firstName || !email || !profession || !platforms || platforms.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // --- CLOUDFLARE TURNSTILE VERIFICATION LOGIC ---
    if (!turnstileToken) {
        return res.status(403).json({ error: 'Anti-bot verification missing.' });
    }

    try {
        const verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
        
        // > FIX: Sending data in URLSearchParams format instead of JSON
        const formParams = new URLSearchParams();
        formParams.append('secret', process.env.TURNSTILE_SECRET_KEY);
        formParams.append('response', turnstileToken);

        const verifyRes = await fetch(verifyUrl, {
            method: 'POST',
            body: formParams,
        });

        const verifyData = await verifyRes.json();

        if (!verifyData.success) {
            // > FIX: Added detailed error logging
            console.log('[ CLOUDFLARE_REJECTED ] Reason:', verifyData['error-codes']);
            return res.status(403).json({ error: 'Security check failed. Are you a bot?' });
        }
        // --- END OF VERIFICATION LOGIC ---

        // Generate a unique Hacker-style Referral Code
        const generateRefCode = firstName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(1000 + Math.random() * 9000);

        // 1. Insert into Supabase (With referral data)
        const { data, error } = await supabase
            .from('waitlist_users')
            .insert([
                { 
                    first_name: firstName, 
                    last_name: lastName, 
                    email: email, 
                    profession: profession, 
                    company: company || null, 
                    platforms: platforms,
                    referral_code: generateRefCode,     
                    referred_by: referredBy || null     
                }
            ])
            .select();

        if (error) {
            if (error.code === '23505') { 
                return res.status(409).json({ error: 'Email already on the waitlist' });
            }
            throw error;
        }
        
        // 2. Send Automated Welcome Email via Resend
        try {
            await resend.emails.send({
                from: 'IntelliGuide <onboarding@resend.dev>',
                to: email,
                subject: '[ CONFIRMED ] // You are on the list',
                html: `
                    <div style="font-family: 'Courier New', Courier, monospace; background-color: #050505; color: #00ffcc; padding: 30px; border: 1px solid #222; max-width: 600px;">
                        <p style="color: #444; font-size: 12px; margin-bottom: 20px;">> SYSTEM_LOG // USER_ADDED</p>
                        <p>> USER: ${firstName.toUpperCase()}</p>
                        <p>> STATUS: WAITLIST SECURED.</p>
                        <br/>
                        <p>> Thank you for adding your name. </p>
                        <p>> You are now one of the early users of IntelliGuide.</p>
                        <br/>
                        <p>> Please wait. We will message you as soon as the system is ready for you.</p>
                        <p style="color: #444; font-size: 12px; margin-top: 40px;">> SYSTEM_STANDBY</p>
                    </div>
                `
            });
            console.log(`[ EMAIL_SENT ] Simple hacker gratitude delivered to ${email}`);
        } catch (emailErr) {
            console.error('[ EMAIL_ERROR ] Failed to transmit:', emailErr);
        }

        res.status(200).json({ message: 'Access Granted. Added to waitlist.', user: data[0] });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[ SYSTEM_ONLINE ] API running on port ${PORT}`));