import React from 'react';

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <>
      {/* Soft subtle backdrop focusing attention onto the flyout */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-30 transition-opacity duration-300 cursor-pointer"
        onClick={onClose}
      ></div>
      {/* FLOATING NOTIFICATION CENTER FLYOUT (Anchored precisely under top-right bell trigger) */}
<div className="fixed top-20 right-8 w-full max-w-[500px] z-50 transition-all duration-300 transform origin-top-right">
  <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[calc(100vh-6rem)] overflow-hidden">
    {/* Panel Header */}
    <div className="p-5 pb-3 bg-white border-b border-slate-100">
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">Notifications</h2>
          <span className="bg-primary text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">6 Updates</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-primary hover:text-secondary text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors" type="button">
            Mark all as read
          </button>
          
        </div>
      </div>
      {/* Filter Chips Carousel/Pills */}
      
    </div>
    {/* Notification Items Scrollable Stack */}
    <div className="flex flex-col overflow-y-auto p-4 gap-3 bg-slate-50/70">{/* Item 1: Marcus Brody Urgent Casual Leave Request */}
<div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-all relative group">
  <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full"></div>
  <div className="flex items-start gap-3 pl-1.5">
    <div className="relative shrink-0 mt-0.5">
      <img className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-slate-200" alt="Marcus Brody" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2OFih0SKha61uQy7CWNoJUJu62PpzZZp9X4jhCAfm-swr6e6nXVvdsy7l6JqRobxYk-0xWsFJT9273JiCl_ZI3tmwyxfmH8n0GGfa9ET4o0-vMbrh0biE3yRasMY6JSjhxZlfEV2g6VVG7a56rJW_EVEvXuzIbWATIur2PkNLm99bGaJMyW0qUyp1Jm4TCyYTibLpH_DEa6vdSceqPOwKL1T3l-G1hJQZvfKfvXnk-0ZmT-VqecYWsQ" />
      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center ring-2 ring-white shadow-sm">
        <span className="material-symbols-outlined text-[12px]">event_busy</span>
      </div>
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">Marcus Brody</span>
          <span className="bg-red-50 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-wide">Urgent Leave</span>
        </div>
        <span className="text-xs text-primary font-semibold shrink-0">5m ago</span>
      </div>
      <p className="text-xs text-slate-600 mt-1.5 leading-snug font-normal">
        <span className="font-semibold text-slate-800">Urgent Casual Leave Request</span> (2 days: Sep 22 – Sep 23) • <span className="text-slate-500">Reason:</span> Personal emergency
      </p>
      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 flex-wrap">
        <button className="bg-primary hover:bg-secondary text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5" type="button">
          <span className="material-symbols-outlined text-[14px]">check</span> Approve
        </button>
        <button className="bg-white hover:bg-red-50 text-error border border-red-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5" type="button">
          <span className="material-symbols-outlined text-[14px]">close</span> Reject
        </button>
        <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5" type="button">
          Review
        </button>
      </div>
    </div>
  </div>
</div>

{/* Item 2: Priya Sharma Annual Leave Application */}
<div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-all relative group">
  <div className="absolute left-0 top-3 bottom-3 w-1 bg-secondary rounded-r-full"></div>
  <div className="flex items-start gap-3 pl-1.5">
    <div className="relative shrink-0 mt-0.5">
      <img className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-slate-200" alt="Priya Sharma" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNev14MsItFxmk4ztgWHvBAOBZiRuE2zFWjA-FCF2dDcBlygI4oLu1Z1kKISh_C3DkRbri9dH_MYoAySSRTwOmAlQsKk5AkmvskJKfQSGBLsIHlCBFQSHh-8yGRF5hNYxrh5kbXyou1T_p-iHAHiWGUKn7lwPr7mdnH9DVKAb76JebJmjE6LsxVN5GPNyqjqEp0c6UiFr4yTyDugphnw_16aOCtfM6Laf5vLdFxJcpFD4HfaO0Br0SyA" />
      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center ring-2 ring-white shadow-sm">
        <span className="material-symbols-outlined text-[12px]">calendar_add_on</span>
      </div>
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">Priya Sharma</span>
          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wide">Leave Request</span>
        </div>
        <span className="text-xs text-slate-400 font-medium shrink-0">25m ago</span>
      </div>
      <p className="text-xs text-slate-600 mt-1.5 leading-snug font-normal">
        <span className="font-semibold text-slate-800">Annual Leave Application</span> (5 days: Oct 14 – Oct 18) • Pending Manager Approval
      </p>
      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
        <button className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm" type="button">
          <span className="material-symbols-outlined text-[15px] text-slate-500">visibility</span> Review Details
        </button>
      </div>
    </div>
  </div>
</div>

{/* Item 3: Holiday Ahead - Mahatma Gandhi Jayanti */}
<div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-all relative group">
  <div className="absolute left-0 top-3 bottom-3 w-1 bg-emerald-500 rounded-r-full"></div>
  <div className="flex items-start gap-3 pl-1.5">
    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 shadow-sm border border-emerald-200">
      <span className="material-symbols-outlined text-[20px]">celebration</span>
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">Upcoming Public Holiday</span>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wide">Holiday Ahead</span>
        </div>
        <span className="text-xs text-emerald-700 font-semibold shrink-0">11 days left</span>
      </div>
      <p className="text-xs text-slate-600 mt-1.5 leading-snug font-normal">
        <span className="font-semibold text-slate-800">Mahatma Gandhi Jayanti (Oct 02)</span> • Mandatory Gazetted Holiday across all India Hubs (11 days remaining)
      </p>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 flex-wrap gap-2">
        <button className="text-primary hover:text-secondary text-xs font-semibold flex items-center gap-1 transition-colors" type="button">
          View Roster Impact <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span> Gazetted Paid
        </span>
      </div>
    </div>
  </div>
</div>

{/* Item 4: Restricted Holiday Window Open */}
<div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-all relative group">
  <div className="flex items-start gap-3 pl-1.5">
    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
      <span className="material-symbols-outlined text-[20px] text-slate-700">event_available</span>
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">Restricted Holiday Window</span>
          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wide">Holiday Notice</span>
        </div>
        <span className="text-xs text-slate-400 font-medium shrink-0">1h ago</span>
      </div>
      <p className="text-xs text-slate-600 mt-1.5 leading-snug font-normal">
        <span className="font-semibold text-slate-800">Dussehra (Oct 20)</span> • Select optional roster preferences by Sep 30.
      </p>
      <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
        <button className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm" type="button">
          <span className="material-symbols-outlined text-[14px] text-primary">edit_calendar</span> Set Roster Preference
        </button>
      </div>
    </div>
  </div>
</div>

{/* Item 5: Geofence Exception Alert - Amal Ramachandran */}
<div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-all relative group">
  <div className="absolute left-0 top-3 bottom-3 w-1 bg-secondary rounded-r-full"></div>
  <div className="flex items-start gap-3 pl-1.5">
    <div className="relative shrink-0 mt-0.5">
      <img className="w-10 h-10 rounded-xl object-cover shadow-sm ring-1 ring-slate-200" alt="Amal Ramachandran" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbsmUFBD-E7Bi0rTyWzluY558I9qOqS41qG8PKP9sZ1kdN_w40aO04ybYllBeg6rSDUMoFdobt5ShKVs8-4IsE36l16YA3xoSokiV8MbcSYPkxXmbjVMq5ze8_UamEjK_jZZRwktIfghii09yXDCZ-cnBdhzsEUcPnwdvAPYx6K3-a_lFR3kF0N_xcXuyZ9rIWABSI8m_ylqaiMLUFwYUo6ZrEGD2qwc7VIqjvEUs2VqcOK5drRRrJaQ" />
      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-secondary text-white flex items-center justify-center ring-2 ring-white shadow-sm">
        <span className="material-symbols-outlined text-[12px]">wrong_location</span>
      </div>
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">Amal Ramachandran</span>
          <span className="bg-red-50 text-secondary text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-200 uppercase tracking-wide">Geofence Alert</span>
        </div>
        <span className="text-xs text-slate-400 shrink-0 font-medium">2h ago</span>
      </div>
      <p className="text-xs text-slate-600 mt-1.5 leading-snug font-normal">
        <span className="font-semibold text-secondary">Geofence Exception Detected</span> • Checked in 450m outside DXB Terminal 2 authorized perimeter at 08:14 AM
      </p>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 flex-wrap gap-2">
        <button className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm" type="button">
          <span className="material-symbols-outlined text-[15px] text-secondary">policy</span> Compliance Check
        </button>
        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px] text-slate-400">pin_drop</span> Terminal 2 North Gate
        </span>
      </div>
    </div>
  </div>
</div>

{/* Item 6: Weekly Shift / Policy Notice */}
<div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200/80 hover:shadow-md transition-all relative group">
  <div className="flex items-start gap-3 pl-1.5">
    <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
      <span className="material-symbols-outlined text-[20px] text-slate-700">badge</span>
    </div>
    <div className="flex flex-col flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-slate-900 text-sm">Shift / Policy Notice</span>
          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 uppercase tracking-wide">Shift Roster</span>
        </div>
        <span className="text-xs text-slate-400 shrink-0 font-medium">Yesterday</span>
      </div>
      <p className="text-xs text-slate-600 mt-1.5 leading-snug font-normal">
        <span className="font-semibold text-slate-800">Weekly Roster Published</span> for DXB Terminal 1 &amp; 3 Operations (Sep 25 - Oct 01) • 42 officers assigned
      </p>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
        <span className="bg-slate-100 text-slate-600 text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-emerald-600">check_circle</span> Published
        </span>
        <button className="text-primary hover:text-secondary text-xs font-semibold flex items-center gap-1 transition-colors" type="button">
          Open Roster View <span className="material-symbols-outlined text-[13px]">launch</span>
        </button>
      </div>
    </div>
  </div>
</div></div>
    {/* Panel Footer Actions */}
    <div className="p-3.5 px-5 bg-white border-t border-slate-100 flex items-center justify-between">
      
      
    </div>
  </div>
</div>

    </>
  );
}
