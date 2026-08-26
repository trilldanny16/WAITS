"use client";

import { useState } from "react";
import {
  ArrowLeft, Bookmark, Check, Clock3, Dumbbell, Heart, Home, Image as ImageIcon,
  Instagram, Menu, MessageCircle, MoreHorizontal, Play, Plus, Repeat2, Search,
  Send, Share2, Sparkles, Users, Video, X,
} from "lucide-react";

type Platform = "Instagram" | "TikTok" | "X" | "Facebook" | "Threads";
const platforms: Platform[] = ["Instagram", "TikTok", "X", "Facebook", "Threads"];

const images = {
  square: "/marketing/social-preview/campaign-square.png",
  vertical: "/marketing/social-preview/campaign-vertical.png",
  wide: "/marketing/social-preview/campaign-wide.png",
};

const grid = [
  [images.square, "Stop finding out after the workout."],
  ["/gallery/sarah-1.png", "6:30 AM crew. No excuses."],
  [images.vertical, "POV: the group chat actually pulled up."],
  ["/gallery/lena-1.png", "Same gym. Same time. Now you know."],
  [images.wide, "Your workout group chat, organized."],
  ["/gallery/danny-1.png", "Chest at 7? Wait Up!"],
  ["/gallery/mike-1.png", "Post it. Let the crew join."],
  ["/gallery/danny-2.png", "Tuesday is already booked."],
  ["/gallery/danny-3.png", "Never lift alone."],
] as const;

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="brand" style={{ color: inverse ? "white" : "#0A84FF" }}>
      <span className="brandIcon"><Clock3 size={16}/><Dumbbell size={13}/></span>
      <span>WAITS</span>
    </div>
  );
}

function Avatar({ size = 44 }: { size?: number }) {
  return <div className="avatar" style={{ width: size, height: size }}><Clock3/><Dumbbell/></div>;
}

function Verified() { return <span className="verified"><Check size={10}/></span>; }

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}

function ConceptBadge() {
  return <div className="concept"><Sparkles size={13}/> CONCEPT · FICTIONAL CONTENT & ENGAGEMENT</div>;
}

function InstagramPreview() {
  return (
    <div className="platformStack">
      <section className="phone light insta">
        <div className="phoneTop"><strong>9:41</strong><span>● ◒ ▰</span></div>
        <div className="appBar"><Instagram/><strong>Instagram</strong><span><Plus/><Menu/></span></div>
        <div className="profileRow"><Avatar size={84}/><div className="metrics"><Metric value="42" label="posts"/><Metric value="3,842" label="followers"/><Metric value="186" label="following"/></div></div>
        <h3>Come Thru <Verified/></h3><p className="handle">@comethruapp</p>
        <p className="bio">Your workout group chat, actually organized.<br/>Post the session. Find your people. <b>Wait Up!</b></p>
        <button className="primary">Follow</button>
        <div className="stories"><div><Avatar size={56}/><span>Start here</span></div><div><img src="/avatars/sarah-model.jpg"/><span>Crews</span></div><div><img src="/avatars/danny-model.jpg"/><span>Wait Up!</span></div><div><img src="/avatars/lena-model.jpg"/><span>Gym talk</span></div></div>
        <div className="grid">{grid.map(([src, text], i) => <div className="tile" key={text}><img src={src}/><span>{text}</span>{i === 2 && <Play/>}</div>)}</div>
        <div className="bottomNav"><Home/><Search/><Plus/><Video/><Avatar size={25}/></div>
      </section>
      <section className="detailCard">
        <div className="detailHeader"><Avatar/><div><b>comethruapp</b> <Verified/><small>Sponsored concept</small></div><MoreHorizontal/></div>
        <div className="heroImage"><img src={images.square}/><div className="heroCopy"><small>STOP FINDING OUT</small><b>after the workout.</b><span>See who’s going before you go.</span></div></div>
        <div className="actions"><span><Heart/><MessageCircle/><Send/></span><Bookmark/></div>
        <p><b>3,218 likes</b></p><p><b>comethruapp</b> Your boys were at the same gym again—you just found out from the post-workout selfie. Post your session. Let the crew tap <b>Wait Up!</b></p>
        <p className="muted">View all 84 comments · 2 hours ago</p>
      </section>
      <section className="storyCard"><div className="storyImage"><img src={images.vertical}/><div className="storyTop"><Avatar size={32}/><b>comethruapp</b><span>1h</span><MoreHorizontal/></div><div className="storyCopy"><small>TONIGHT · 7:30 PM</small><h2>Chest at 7?</h2><p>Mazzi + 3 friends are going.</p><button>WAIT UP!</button></div></div><p><b>Story concept:</b> one-tap urgency with a real workout invite.</p></section>
    </div>
  );
}

const tiktoks = [
  [images.vertical, "POV: everybody actually showed up", "48.2K"],
  [images.square, "Your friend: ‘I wish I knew’", "31.7K"],
  ["/gallery/lena-1.png", "Girls’ leg day at 6:30", "22.9K"],
  ["/gallery/danny-1.png", "Chest at 7?", "18.4K"],
  [images.wide, "Same gym. Same time.", "15.1K"],
  ["/gallery/mike-1.png", "The organized group chat", "12.8K"],
] as const;

function TikTokPreview() {
  return <div className="platformStack"><section className="phone dark tiktok"><div className="phoneTop"><strong>9:41</strong><span>● ◒ ▰</span></div><div className="appBar"><ArrowLeft/><strong>Profile</strong><Menu/></div><div className="center"><Avatar size={90}/><h2>Come Thru <Verified/></h2><p>@comethruapp</p><div className="metrics compact"><Metric value="214" label="Following"/><Metric value="18.6K" label="Followers"/><Metric value="246.4K" label="Likes"/></div><button className="follow">Follow</button><p>Your workout group chat, actually organized. 🏋️‍♀️</p></div><div className="videoGrid">{tiktoks.map(([src,text,views])=><div key={text}><img src={src}/><b>{text}</b><span><Play/> {views}</span></div>)}</div></section><section className="tiktokFeature"><img src={images.vertical}/><div className="shade"/><div className="ttCopy"><b>@comethruapp</b><p>POV: you posted “chest at 7?” and the whole crew actually pulled up. #gymtok #workoutpartner</p><small>♫ original sound — Come Thru</small></div><div className="rail"><Avatar/><Heart/><b>48.2K</b><MessageCircle/><b>613</b><Bookmark/><b>4,190</b><Share2/><b>1,204</b></div></section></div>;
}

function Tweet({ pinned, text, stats }: { pinned?: boolean; text: string; stats: string[] }) {
  return <article className="tweet">{pinned && <small className="pinned">📌 Pinned</small>}<div className="tweetBody"><Avatar/><div><b>Come Thru <Verified/></b> <span className="muted">@comethruapp · 2h</span><p>{text}</p><div className="tweetStats"><span><MessageCircle/> {stats[0]}</span><span><Repeat2/> {stats[1]}</span><span><Heart/> {stats[2]}</span><span><Share2/></span></div></div></div></article>;
}

function XPreview() { return <section className="desktopMock xMock"><div className="xBanner"><img src={images.wide}/><div className="bannerWords"><Brand inverse/><h2>Never lift alone.</h2><p>Post the workout. Find out who’s in.</p></div></div><div className="xProfile"><Avatar size={96}/><button>Follow</button><h2>Come Thru <Verified/></h2><p className="muted">@comethruapp</p><p>Your workout group chat, actually organized. Post workouts, join friends, and stop finding out afterward that everybody trained without you.</p><p className="muted">📍 Anywhere your crew trains · 🔗 comethru.app</p><div className="followStats"><b>186</b> Following&nbsp;&nbsp; <b>12.8K</b> Followers</div></div><Tweet pinned text="Introducing Come Thru: the fastest way to turn ‘we should hit the gym sometime’ into an actual workout. Post the time. Your friends tap Wait Up! That’s it." stats={["92","418","2.1K"]}/><Tweet text="Chest at 7?" stats={["164","91","1.8K"]}/><Tweet text="Stop finding out AFTER the workout that your boys were at the same gym." stats={["47","602","3.4K"]}/><Tweet text="Your Tuesday workout shouldn’t need 46 unread group-chat messages to happen." stats={["31","284","1.6K"]}/></section>; }

function FacebookPreview() { return <section className="desktopMock fbMock"><div className="fbCover"><img src={images.wide}/><div><h1>Who’s coming through?</h1><p>Turn plans into workouts.</p></div></div><div className="fbIdentity"><Avatar size={104}/><div><h2>Come Thru <Verified/></h2><p>App · Community · Fitness</p><b>8.7K followers</b></div><button>Follow</button></div><div className="fbTabs"><b>Posts</b><span>About</span><span>Photos</span><span>Videos</span><MoreHorizontal/></div><div className="fbColumns"><aside><h3>About</h3><p>Come Thru helps people coordinate workouts with friends and people nearby.</p><p>🏋️ Built for people who already have a gym membership.</p><p>📱 Post. Join. Train together.</p></aside><main><article className="fbPost"><div className="detailHeader"><Avatar/><div><b>Come Thru <Verified/></b><small>2h · 🌐</small></div><MoreHorizontal/></div><p><b>“I didn’t know y’all were going.”</b><br/>That sentence is officially retired.</p><img src={images.square}/><div className="engagement">💙 ❤️ 1.2K <span>86 comments · 41 shares</span></div><div className="postActions"><b>Like</b><b>Comment</b><b>Share</b></div><div className="comment"><img src="/avatars/sarah-model.jpg"/><p><b>Sarah Kim</b><br/>Finally. Our group chat is chaos 😂</p></div></article><article className="fbPost"><div className="detailHeader"><Avatar/><div><b>Come Thru</b><small>Yesterday · 🌐</small></div></div><p>Tonight: legs at 6:30. Tomorrow: pretending stairs don’t exist. Who’s in?</p></article></main></div></section>; }

const threadPosts = [
  ["Chest at 7?", "1,482", "96"],
  ["The gym has 40 treadmills and somehow your friend is always on the one next to you—after neither of you knew the other was coming.", "3,906", "211"],
  ["Your workout group chat, but the plan doesn’t get buried under 37 memes.", "2,744", "143"],
  ["Hot take: ‘we should work out sometime’ needs a date and time attached.", "5,109", "384"],
  ["Post it. Let your people tap Wait Up! Train together. It really can be that simple.", "1,908", "72"],
] as const;

function ThreadsPreview() { return <section className="phone light threads"><div className="phoneTop"><strong>9:41</strong><span>● ◒ ▰</span></div><div className="threadsTitle"><b>Come Thru</b><span>@</span></div><div className="threadsProfile"><div><h2>Come Thru <Verified/></h2><p>comethruapp</p></div><Avatar size={72}/><p>Your workout group chat, actually organized.<br/>Post it. Let the crew join. 🏋️</p><p><span className="stackedAvatars"><img src="/avatars/sarah-model.jpg"/><img src="/avatars/danny-model.jpg"/></span> 9.4K followers</p><button>Follow</button></div>{threadPosts.map(([text,likes,replies],i)=><article className="thread" key={text}><Avatar size={38}/><div><b>comethruapp <Verified/></b><span className="muted"> {i+1}h</span><p>{text}</p>{i===0&&<div className="reply"><img src="/avatars/danny-model.jpg"/><p><b>dannylifts</b><br/>Wait up. I’m in 🤝</p></div>}<div className="threadActions"><Heart/><MessageCircle/><Repeat2/><Send/></div><small>{replies} replies · {likes} likes</small></div><MoreHorizontal/></article>)}<div className="bottomNav"><Home/><Search/><Plus/><Heart/><Avatar size={25}/></div></section>; }

const previews: Record<Platform, () => React.JSX.Element> = { Instagram: InstagramPreview, TikTok: TikTokPreview, X: XPreview, Facebook: FacebookPreview, Threads: ThreadsPreview };

const strategy: Record<Platform, { hook: string; goal: string; format: string }> = {
  Instagram:{hook:"Make the social problem instantly recognizable.",goal:"Build brand trust and saves",format:"Reels + bold carousel covers"},
  TikTok:{hook:"POV: the crew actually pulled up.",goal:"Earn shares and app curiosity",format:"Fast, human, trend-aware video"},
  X:{hook:"Short gym truths people want to repost.",goal:"Own the conversation",format:"One-liners + launch updates"},
  Facebook:{hook:"Make coordination useful for real friend groups.",goal:"Build local community credibility",format:"Promos + comments + events"},
  Threads:{hook:"Sound like the funniest person in the gym group chat.",goal:"Create community voice",format:"Conversation-first posts"},
};

export function SocialPreviewGallery() {
  const [active, setActive] = useState<Platform>("Instagram");
  const Preview = previews[active];
  return <main className="galleryPage"><header className="galleryHero"><div><Brand inverse/><p>COME THRU SOCIAL LAUNCH CONCEPTS</p><h1>Make the invite feel impossible to ignore.</h1><p className="lede">Five launch-ready ways to show how Come Thru turns “we should work out” into an actual plan.</p></div><ConceptBadge/></header><nav className="platformTabs" aria-label="Social platform previews">{platforms.map(p=><button key={p} onClick={()=>setActive(p)} className={active===p?"active":""}>{p}</button>)}</nav><div className="galleryLayout"><aside className="strategy"><span className="eyebrow">{active.toUpperCase()} DIRECTION</span><h2>{strategy[active].hook}</h2><div><small>PRIMARY GOAL</small><b>{strategy[active].goal}</b></div><div><small>BEST FORMAT</small><b>{strategy[active].format}</b></div><div><small>BRAND VOICE</small><b>Friendly. Direct. A little playful.</b></div><blockquote>“Your workout group chat, actually organized.”</blockquote><p className="disclaimer">These visuals, people, account details, and engagement figures are fictional concepts for internal brand planning.</p></aside><div className="previewStage"><div className="stageLabel"><span><span className="liveDot"/> LIVE CONCEPT VIEW</span><span>Switch tabs to compare</span></div><Preview/></div></div><footer><Brand inverse/><p>Mockups only · No social accounts or integrations connected.</p></footer><style jsx global>{styles}</style></main>;
}

const styles = `
*{box-sizing:border-box}.galleryPage{min-height:100vh;background:#0b1020;color:#1c1c1e;font-family:var(--font-geist-sans),Arial,sans-serif}.galleryHero{min-height:330px;padding:56px max(28px,calc((100vw - 1320px)/2));display:flex;justify-content:space-between;align-items:flex-start;gap:30px;color:white;background:radial-gradient(circle at 82% 18%,#0a84ff77,transparent 26%),linear-gradient(135deg,#11172d,#070a13)}.brand{display:flex;align-items:center;gap:10px;font-size:22px;font-weight:950;letter-spacing:.08em}.brandIcon{position:relative;width:35px;height:35px;border-radius:50%;display:grid;place-items:center;background:#baff29;color:#111}.brandIcon svg:last-child{position:absolute;transform:rotate(-18deg)}.galleryHero>div>p:first-of-type,.eyebrow{color:#baff29;font-weight:850;font-size:12px;letter-spacing:.16em;margin-top:44px}.galleryHero h1{font-size:clamp(38px,5vw,72px);line-height:.96;letter-spacing:-.055em;max-width:850px;margin:12px 0 20px}.lede{color:#c6cada;font-size:18px;max-width:650px;line-height:1.55}.concept{display:flex;gap:7px;align-items:center;padding:10px 13px;border:1px solid #ffffff2b;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.08em;background:#ffffff0c;white-space:nowrap}.platformTabs{position:sticky;top:0;z-index:50;display:flex;justify-content:center;gap:7px;padding:12px;background:#0b1020e8;backdrop-filter:blur(16px);border-bottom:1px solid #ffffff14}.platformTabs button{border:0;color:#aeb5cb;background:transparent;border-radius:999px;padding:12px 22px;font-weight:800;cursor:pointer}.platformTabs button.active{background:#0a84ff;color:white;box-shadow:0 8px 28px #0a84ff55}.platformTabs button:focus-visible{outline:3px solid #baff29;outline-offset:2px}.galleryLayout{max-width:1320px;margin:auto;display:grid;grid-template-columns:300px 1fr;gap:28px;padding:38px 24px 70px}.strategy{position:sticky;top:92px;height:max-content;background:#151b31;color:white;border:1px solid #ffffff12;border-radius:28px;padding:26px}.strategy h2{font-size:28px;line-height:1.08;margin:12px 0 28px}.strategy>div{display:grid;gap:4px;padding:16px 0;border-top:1px solid #ffffff12}.strategy small{color:#858da6;font-size:10px;letter-spacing:.12em;font-weight:800}.strategy b{font-size:14px}.strategy blockquote{margin:18px 0;padding:18px;border-radius:16px;background:#baff29;color:#111;font-size:16px;font-weight:900}.disclaimer{color:#858da6;font-size:11px;line-height:1.5}.previewStage{min-width:0}.stageLabel{display:flex;justify-content:space-between;color:#9da4b9;font-size:10px;font-weight:800;letter-spacing:.12em;margin:5px 3px 15px}.liveDot{display:inline-block;width:7px;height:7px;background:#baff29;border-radius:50%;box-shadow:0 0 12px #baff29;margin-right:5px}.platformStack{display:grid;grid-template-columns:minmax(340px,430px) minmax(320px,1fr);gap:20px;align-items:start}.platformStack>*{box-shadow:0 30px 80px #0006}.phone,.desktopMock,.detailCard,.storyCard{border-radius:30px;overflow:hidden}.phone{width:100%;max-width:430px;margin:auto;min-height:780px;position:relative;padding-bottom:62px}.light{background:#fff}.dark{background:#090909;color:#fff}.phoneTop{height:38px;padding:13px 22px 0;display:flex;justify-content:space-between;font-size:11px}.appBar{height:52px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ddd}.appBar>span{display:flex;gap:17px}.appBar svg{width:20px}.avatar{flex:0 0 auto;border-radius:50%;display:grid;place-items:center;position:relative;background:linear-gradient(145deg,#0a84ff,#2450c5);color:white;border:3px solid white}.avatar svg:first-child{width:58%;height:58%;opacity:.45}.avatar svg:last-child{position:absolute;width:48%;transform:rotate(-18deg)}.profileRow{display:flex;gap:22px;align-items:center;padding:18px}.metrics{display:flex;justify-content:space-around;flex:1}.metric{display:grid;text-align:center}.metric strong{font-size:17px}.metric span{font-size:11px}.insta>h3,.insta>.handle,.insta>.bio{margin:0 18px}.insta h3{font-size:15px}.verified{display:inline-grid;place-items:center;width:15px;height:15px;border-radius:50%;background:#0a84ff;color:white;vertical-align:middle}.handle,.muted{color:#777}.bio{font-size:12px;line-height:1.45;margin-top:5px!important}.primary,.follow{border:0;border-radius:9px;background:#0a84ff;color:#fff;font-weight:800;height:34px}.primary{margin:13px 18px;width:calc(100% - 36px)}.stories{display:flex;gap:14px;padding:7px 16px 14px;overflow:hidden}.stories>div{display:grid;justify-items:center;gap:4px;font-size:9px}.stories img{width:56px;height:56px;border-radius:50%;object-fit:cover;border:3px solid white;outline:2px solid #ff2f78}.grid,.videoGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}.tile{height:130px;position:relative;background:#222;overflow:hidden}.tile img,.videoGrid img{width:100%;height:100%;object-fit:cover}.tile:after,.videoGrid>div:after{content:'';position:absolute;inset:45% 0 0;background:linear-gradient(transparent,#000b)}.tile span{position:absolute;left:8px;right:8px;bottom:8px;z-index:2;color:white;font-size:10px;font-weight:900;line-height:1.1}.tile svg{position:absolute;right:7px;top:7px;color:white;z-index:2}.bottomNav{position:absolute;bottom:0;left:0;right:0;height:58px;display:flex;align-items:center;justify-content:space-around;background:inherit;border-top:1px solid #ddd}.bottomNav svg{width:20px}.detailCard,.storyCard{background:white}.detailHeader{display:flex;align-items:center;gap:10px;padding:13px}.detailHeader>div:nth-child(2){display:grid;flex:1;font-size:12px}.detailHeader small{color:#888}.heroImage{height:450px;position:relative;background:#111}.heroImage>img,.storyImage>img{width:100%;height:100%;object-fit:cover}.heroImage:after{content:'';position:absolute;inset:30% 0 0;background:linear-gradient(transparent,#000c)}.heroCopy{position:absolute;z-index:2;bottom:28px;left:24px;color:white;display:grid}.heroCopy small{color:#baff29;font-weight:900;letter-spacing:.15em}.heroCopy b{font-size:34px}.actions{display:flex;justify-content:space-between;padding:13px}.actions span{display:flex;gap:17px}.detailCard>p{font-size:12px;line-height:1.4;margin:5px 14px 12px}.storyCard{grid-column:2}.storyImage{height:600px;position:relative}.storyImage:after{content:'';position:absolute;inset:0;background:linear-gradient(#0006,transparent 30%,#000b)}.storyTop{position:absolute;z-index:2;top:20px;left:18px;right:18px;display:flex;align-items:center;gap:9px;color:white}.storyTop span{flex:1}.storyCopy{position:absolute;z-index:2;left:24px;right:24px;bottom:30px;color:white}.storyCopy small{color:#baff29;font-weight:900}.storyCopy h2{font-size:48px;margin:4px 0}.storyCopy button{width:100%;border:0;border-radius:999px;background:#baff29;padding:15px;font-weight:950}.storyCard>p{padding:0 16px 16px}.center{text-align:center;padding:13px 20px}.center>.avatar{margin:auto}.center h2{margin:10px 0 2px}.center p{font-size:12px}.compact{max-width:280px;margin:18px auto}.follow{width:180px}.videoGrid>div{height:220px;position:relative}.videoGrid b{position:absolute;z-index:2;bottom:22px;left:7px;right:7px;font-size:10px}.videoGrid span{position:absolute;z-index:2;bottom:5px;left:7px;font-size:9px;display:flex;align-items:center}.videoGrid svg{width:10px}.tiktokFeature{height:780px;position:relative;border-radius:30px;overflow:hidden;background:#000;color:white}.tiktokFeature>img{width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(transparent 45%,#000d)}.ttCopy{position:absolute;left:20px;right:70px;bottom:25px;z-index:2;font-size:13px}.rail{position:absolute;z-index:3;right:13px;bottom:25px;display:grid;justify-items:center;gap:5px}.rail>svg{margin-top:13px}.rail b{font-size:10px}.desktopMock{background:#fff;max-width:760px;margin:auto}.xBanner,.fbCover{height:250px;position:relative;background:#174}.xBanner img,.fbCover img{width:100%;height:100%;object-fit:cover}.xBanner:after,.fbCover:after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,#091026df,transparent)}.bannerWords,.fbCover>div{position:absolute;z-index:2;left:35px;top:44px;color:white}.bannerWords h2,.fbCover h1{font-size:38px;margin:16px 0 4px}.xProfile{position:relative;padding:58px 25px 18px}.xProfile>.avatar{position:absolute;top:-50px}.xProfile button,.fbIdentity button{float:right;border:1px solid #ddd;background:#111;color:white;border-radius:99px;padding:10px 24px;font-weight:800}.xProfile h2{margin:0}.followStats{font-size:12px;margin-top:10px}.tweet{padding:15px 24px;border-top:1px solid #eee}.pinned{margin-left:55px;color:#777}.tweetBody{display:flex;gap:12px}.tweetBody>div{flex:1;font-size:13px}.tweetStats{display:flex;justify-content:space-between;color:#667;margin-top:15px}.tweetStats span{display:flex;align-items:center;gap:5px}.tweetStats svg{width:15px}.fbCover>div{top:70px}.fbIdentity{display:flex;gap:16px;align-items:center;padding:18px 26px}.fbIdentity>div{flex:1}.fbIdentity h2{margin:0}.fbIdentity p{margin:4px 0;color:#777}.fbTabs{display:flex;gap:28px;padding:15px 25px;border-top:1px solid #eee;border-bottom:1px solid #eee}.fbTabs b{color:#0a84ff}.fbTabs svg{margin-left:auto}.fbColumns{display:grid;grid-template-columns:260px 1fr;gap:14px;padding:14px;background:#f0f2f5}.fbColumns aside,.fbPost{background:#fff;border-radius:12px;padding:16px}.fbColumns aside{height:max-content;font-size:12px}.fbPost{padding:0;margin-bottom:14px}.fbPost>p{padding:0 16px}.fbPost>img{width:100%;max-height:390px;object-fit:cover}.engagement{font-size:11px;padding:10px 15px;border-bottom:1px solid #eee}.engagement span{float:right}.postActions{display:flex;justify-content:space-around;padding:10px}.comment{display:flex;gap:8px;padding:10px}.comment img{width:34px;height:34px;border-radius:50%;object-fit:cover}.comment p{background:#f0f2f5;border-radius:16px;padding:8px;margin:0;font-size:11px}.threadsTitle{text-align:center;padding:13px;font-size:18px;border-bottom:1px solid #eee}.threadsTitle span{float:right;font-size:22px}.threadsProfile{padding:18px}.threadsProfile>div:first-child{float:left}.threadsProfile>.avatar{float:right}.threadsProfile>p{clear:both;font-size:12px;padding-top:10px}.threadsProfile button{width:100%;height:35px;border:1px solid #ddd;border-radius:9px;background:#fff;font-weight:800}.stackedAvatars img{width:20px;height:20px;border-radius:50%;object-fit:cover;margin-right:-7px;border:2px solid white}.thread{display:flex;gap:10px;padding:16px;border-top:1px solid #eee;font-size:12px}.thread>div:nth-child(2){flex:1}.thread>svg{width:16px}.thread p{line-height:1.5}.threadActions{display:flex;gap:20px;margin:10px 0}.threadActions svg{width:17px}.reply{display:flex;gap:8px;border-left:2px solid #ddd;padding:7px}.reply img{width:30px;height:30px;border-radius:50%;object-fit:cover}.reply p{margin:0}.galleryPage footer{display:flex;align-items:center;justify-content:space-between;max-width:1320px;margin:auto;padding:30px 24px 50px;color:#8f97ad;border-top:1px solid #ffffff12;font-size:12px}
@media(max-width:900px){.galleryHero{min-height:280px;padding:35px 22px;display:block}.concept{margin-top:25px;width:max-content}.galleryLayout{grid-template-columns:1fr;padding:22px 12px}.strategy{position:static}.platformTabs{justify-content:flex-start;overflow-x:auto}.platformTabs button{padding:10px 15px}.platformStack{grid-template-columns:1fr}.storyCard{grid-column:auto}.detailCard,.storyCard,.tiktokFeature{max-width:430px;margin:auto}.desktopMock{border-radius:20px}.fbColumns{grid-template-columns:1fr}.galleryPage footer{display:grid;gap:14px}}`;

