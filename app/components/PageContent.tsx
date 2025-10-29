'use client';

import { useState } from 'react';
import Dashboard from './Dashboard';
import TabbedContent from './TabbedContent';

type Tab = 'connections' | 'concepts';

export default function PageContent() {
  const [activeTab, setActiveTab] = useState<Tab>('connections');

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Intrdrm</h1>
              <p className="mt-1 text-sm text-gray-500">
                AI-powered conceptual daydreaming
              </p>
            </div>

            {/* Top Tab Navigation (mobile & tablet) */}
            <nav className="flex space-x-3 lg:hidden">
              <button
                onClick={() => setActiveTab('connections')}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-colors
                  ${
                    activeTab === 'connections'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Connections
              </button>
              <button
                onClick={() => setActiveTab('concepts')}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm transition-colors
                  ${
                    activeTab === 'concepts'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Concepts
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12">
          {/* Side Panel */}
          <aside className="order-1 lg:order-none lg:sticky lg:top-24 flex flex-col gap-6">
            <nav className="hidden lg:flex flex-col gap-2 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Views
              </h2>
              <button
                onClick={() => setActiveTab('connections')}
                className={`
                  text-left px-3 py-2 rounded-md font-medium text-sm transition-colors
                  ${
                    activeTab === 'connections'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Connections
              </button>
              <button
                onClick={() => setActiveTab('concepts')}
                className={`
                  text-left px-3 py-2 rounded-md font-medium text-sm transition-colors
                  ${
                    activeTab === 'concepts'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                Concepts
              </button>
            </nav>

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Metrics
              </h2>
              <div className="mt-4">
                <Dashboard />
              </div>
            </div>
          </aside>

          {/* Tabbed Content */}
          <section className="order-2 lg:order-none">
            <TabbedContent activeTab={activeTab} />
          </section>
        </div>
      </div>
    </>
  );
}
