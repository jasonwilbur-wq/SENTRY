import React from 'react';
import { Tab, TABS } from './types';

export function VendorTabNav({
  modalBaseId,
  activeTab,
  selectedTabIndex,
  onTabClick,
  onTabKeyDown,
}: {
  modalBaseId: string;
  activeTab: Tab;
  selectedTabIndex: number;
  onTabClick: (tab: Tab) => void;
  onTabKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => void;
}) {
  return (
    <div
      className="shrink-0 px-8 flex gap-8"
      role="tablist"
      aria-label="Vendor detail sections"
      style={{ borderBottom: '1px solid var(--s-border)', background: 'var(--s-modal-tabs)' }}
    >
      {TABS.map((tab, index) => (
        <button
          key={tab.id}
          id={`${modalBaseId}-tab-${tab.id}`}
          role="tab"
          type="button"
          tabIndex={selectedTabIndex === index ? 0 : -1}
          aria-selected={activeTab === tab.id}
          aria-controls={`${modalBaseId}-panel-${tab.id}`}
          onClick={() => onTabClick(tab.id)}
          onKeyDown={(event) => onTabKeyDown(event, index)}
          className="relative py-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          style={{
            color: activeTab === tab.id ? '#ffffff' : '#475569',
            borderBottom: activeTab === tab.id ? '2px solid #0053E2' : '2px solid transparent',
          }}
        >
          {tab.label}
          {activeTab === tab.id && (
            <div
              className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
              style={{
                background: 'linear-gradient(90deg, #0053E2, #4d9fff)',
                boxShadow: '0 0 8px rgba(0,83,226,0.6)',
                animation: 'tab-slide 0.2s ease-out both',
                transformOrigin: 'left',
              }}
              aria-hidden="true"
            />
          )}
        </button>
      ))}
    </div>
  );
}
