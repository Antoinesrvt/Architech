"use client";

import MainLayout from "@/components/layouts/MainLayout";

export default function TestComponentsPage() {
  return (
    <MainLayout>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">DaisyUI Component Test</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Buttons */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Buttons</h2>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary">
                  Primary
                </button>
                <button type="button" className="btn btn-secondary">
                  Secondary
                </button>
                <button type="button" className="btn btn-accent">
                  Accent
                </button>
                <button type="button" className="btn btn-neutral">
                  Neutral
                </button>
                <button type="button" className="btn btn-info">
                  Info
                </button>
                <button type="button" className="btn btn-success">
                  Success
                </button>
                <button type="button" className="btn btn-warning">
                  Warning
                </button>
                <button type="button" className="btn btn-error">
                  Error
                </button>
              </div>

              <h3 className="text-lg font-semibold mt-4">Button Sizes</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-xs">
                  Extra Small
                </button>
                <button type="button" className="btn btn-sm">
                  Small
                </button>
                <button type="button" className="btn">
                  Normal
                </button>
                <button type="button" className="btn btn-lg">
                  Large
                </button>
              </div>

              <h3 className="text-lg font-semibold mt-4">Button Variants</h3>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-outline btn-primary">
                  Outline
                </button>
                <button type="button" className="btn btn-ghost">
                  Ghost
                </button>
                <button type="button" className="btn btn-link">
                  Link
                </button>
              </div>
            </div>
          </div>

          {/* Form Elements */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Form Elements</h2>

              <div className="form-control w-full max-w-xs">
                <label className="label">
                  <span className="label-text">Text Input</span>
                </label>
                <input
                  type="text"
                  placeholder="Type here"
                  className="input input-bordered w-full max-w-xs"
                />
              </div>

              <div className="form-control w-full max-w-xs mt-4">
                <label className="label">
                  <span className="label-text">Select</span>
                </label>
                <select className="select select-bordered">
                  <option disabled selected>
                    Select an option
                  </option>
                  <option>Option 1</option>
                  <option>Option 2</option>
                  <option>Option 3</option>
                </select>
              </div>

              <div className="form-control mt-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Toggle</span>
                  <input type="checkbox" className="toggle toggle-primary" />
                </label>
              </div>

              <div className="form-control mt-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Checkbox</span>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary"
                  />
                </label>
              </div>

              <div className="form-control mt-4">
                <label className="label cursor-pointer">
                  <span className="label-text">Radio</span>
                  <input
                    type="radio"
                    name="radio-test"
                    className="radio radio-primary"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Alerts */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">Alerts</h2>

              <div className="alert alert-info mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="stroke-current shrink-0 w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Information message</span>
              </div>

              <div className="alert alert-success mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Success message</span>
              </div>

              <div className="alert alert-warning mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>Warning message</span>
              </div>

              <div className="alert alert-error">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Error message</span>
              </div>
            </div>
          </div>

          {/* Badges & Others */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">More Components</h2>

              <h3 className="text-lg font-semibold">Badges</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="badge badge-primary">Primary</span>
                <span className="badge badge-secondary">Secondary</span>
                <span className="badge badge-accent">Accent</span>
                <span className="badge badge-outline">Outline</span>
              </div>

              <h3 className="text-lg font-semibold mt-4">Progress</h3>
              <progress
                className="progress progress-primary w-full"
                value="40"
                max="100"
              />

              <h3 className="text-lg font-semibold mt-4">Tabs</h3>
              <div className="tabs tabs-boxed">
                <a className="tab">Tab 1</a>
                <a className="tab tab-active">Tab 2</a>
                <a className="tab">Tab 3</a>
              </div>

              <h3 className="text-lg font-semibold mt-4">Dropdown</h3>
              <div className="dropdown">
                <label className="btn m-1">Click</label>
                <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
                  <li>
                    <a>Item 1</a>
                  </li>
                  <li>
                    <a>Item 2</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
