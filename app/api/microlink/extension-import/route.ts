import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server Config Error' }, { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { items, workspace } = body; 

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid item array provided.' }, { status: 400, headers: corsHeaders });
    }

    const TEAM_WORKSPACE_ID = '11111111-1111-1111-1111-111111111111';
    const targetWorkspaceId = workspace === 'team' ? TEAM_WORKSPACE_ID : null;

    // 🚀 MAGIC HAPPENS HERE: Loop through items and hit Microlink concurrently
    const insertData = await Promise.all(items.map(async (item: any) => {
      let richTitle = 'Instagram Reel';
      let richContent = null;
      let richImage = item.thumbnail_url || "https://images.unsplash.com/photo-1616469829581-73993eb86b02?auto=format&fit=crop&w=800&q=80"; // Fallback to extension's scraped image

      try {
        // Fetch rich metadata from Microlink
        const res = await fetch(`https://api.microlink.io?url=${encodeURIComponent(item.url)}`);
        
        if (res.ok) {
          const mData = await res.json();
          const info = mData.data;
          
          // Overwrite with high-quality Microlink data if it exists
          if (info.title) richTitle = info.title;
          if (info.description) richContent = info.description;
          if (info.image?.url) richImage = info.image.url;
        }
      } catch (error) {
        console.error('Microlink fetch failed for:', item.url);
        // It will silently fail and just use the fallback scraped data!
      }

      return {
        type: 'link', 
        url: item.url,
        thumbnail_url: richImage,
        title: richTitle,
        content: richContent, // Adds the Instagram caption if Microlink found it!
        sections: ['Inbox', 'Instagram'],
        creator: 'Extension Importer',
        workspace_id: targetWorkspaceId, 
        user_id: 'e7acff70-e1d7-4183-88a1-dbc2e9d2aedb', 
        created_at: new Date().toISOString()
      };
    }));

    // Save the rich data to Supabase
    const { error } = await supabase.from('assets').insert(insertData);

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, count: items.length }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Server Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}