import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Using the Service Role Key to bypass RLS security blocks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Invalid URL array provided.' }, { status: 400, headers: corsHeaders });
    }

    const insertData = urls.map((url: string) => ({
      type: 'link',
      url: url,
      title: 'Imported Instagram Reel',
      sections: ['Inbox', 'Instagram'],
      creator: 'Extension Importer',
      // 👉 IMPORTANT: Put your exact Supabase User ID here!
      user_id: 'e7acff70-e1d7-4183-88a1-dbc2e9d2aedb', 
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('assets').insert(insertData);

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, count: urls.length }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}