import { useEffect, useState } from "react";
import { FiBookOpen, FiX } from "react-icons/fi";
import { useLocation } from "react-router-dom";
import "../styles/docs.css";

const pageGuides = {
  "/dashboard": {
    title: "Using the dashboard",
    intro:
      "The dashboard is a quick overview of school activity. Use its cards and links to open the detailed pages.",
    sections: [
      {
        title: "What you’ll find",
        items: [
          "Review learner, route, trip, and attendance summaries.",
          "Check recent announcements and open the announcements page to manage them.",
          "Use the trip and attendance panels to spot items that need attention.",
        ],
      },
      {
        title: "Keeping information current",
        items: [
          "Dashboard data is loaded from the school records and refreshed as updates arrive.",
          "Open Students, Routes, Attendance, or School Trips to make changes to the underlying records.",
        ],
      },
    ],
  },
  "/students": {
    title: "Managing students",
    intro:
      "The student directory is the school’s central list of learners used by attendance, routes, and school trips.",
    sections: [
      {
        title: "Add and maintain student records",
        items: [
          "Select Add student and enter the learner’s first name, last name, and grade or class (for example, Grade 9A or Class B).",
          "Use the search, grade, and status filters to find records. Use the row actions to edit or remove a learner.",
          "Link a parent or guardian and assign transport from the relevant parent and route workflows.",
        ],
      },
      {
        title: "Plan limits and exports",
        items: [
          "The learner count and current plan limit are shown above the directory. Upgrade through Billing before adding learners beyond the plan allowance.",
          "Use Excel or PDF to export the currently available student directory data.",
        ],
      },
    ],
    note:
      "Learner records are used by other school features. Confirm the learner and grade details before assigning attendance or transport.",
  },
  "/drivers": {
    title: "Managing drivers",
    intro:
      "Maintain the school’s driver records and keep their contact and role details up to date.",
    sections: [
      {
        title: "Driver workflow",
        items: [
          "Add a driver with the requested identity and contact details, then review the record in the driver list.",
          "Edit a driver to keep their information current; deactivate or remove access when they should no longer operate for the school.",
          "Assign drivers to routes or trip vehicles using the relevant route or trip assignment controls.",
        ],
      },
    ],
    note:
      "Only assign a driver after confirming they are authorised and suitable for the vehicle and journey.",
  },
  "/vehicles": {
    title: "Managing vehicles",
    intro:
      "Use the fleet page to review vehicle records, status, and availability for school transport.",
    sections: [
      {
        title: "Vehicle workflow",
        items: [
          "Add a vehicle with its registration, type, capacity, and other available fleet details.",
          "Keep documents, expiry dates, and maintenance status current so the school can assess readiness.",
          "Assign an available vehicle to the appropriate route or school trip.",
        ],
      },
      {
        title: "Vehicle statuses",
        items: [
          "Available: ready for assignment.",
          "Assigned: currently allocated to school transport.",
          "Maintenance: unavailable while being serviced.",
          "Inactive: not currently in service.",
        ],
      },
    ],
  },
  "/routes": {
    title: "Managing routes",
    intro:
      "Routes organise regular school transport between pickup points and the school.",
    sections: [
      {
        title: "Create and maintain a route",
        items: [
          "Enter a clear route name, start and end locations, schedule, and pickup stops.",
          "Assign the learners who use the route, then allocate an available driver and vehicle.",
          "Review route details and assignments after changes to learner enrolment or fleet availability.",
        ],
      },
      {
        title: "Operational checks",
        items: [
          "Check that the assigned vehicle has enough passenger capacity for its learners.",
          "Use Live Tracking to monitor location when the driver is sharing a trip location.",
        ],
      },
    ],
  },
  "/trips": {
    title: "How School Trips work",
    intro:
      "Plan excursions, allocate learners and vehicles, and keep families informed as trip plans progress.",
    sections: [
      {
        title: "Creating and running a trip",
        items: [
          "Add a trip with its destination, schedule, price, registration deadline, and learner limits.",
          "Choose participating learners and assign one or more school vehicles within available seat capacity.",
          "Keep the trip as a draft while preparing details, or open registration when families can sign up.",
          "Update the status as plans progress. Participating families are notified of status changes.",
        ],
      },
      {
        title: "Trip statuses",
        items: [
          "Draft: saved for staff; unpublished and not open for family registration.",
          "Registration open: published and accepting registrations until the deadline or capacity is reached.",
          "Confirmed: the trip is confirmed; it needs an assigned vehicle and eligible learners.",
          "Preparing: the school is finalising arrangements; eligible learners are required, and a vehicle may be added later.",
          "In progress: the trip is underway; an assigned vehicle and eligible learners are required. Live tracking is available when location is shared.",
          "Completed: the trip has finished; this is a final status.",
          "Cancelled: the trip will not go ahead; families are notified and this is a final status.",
        ],
      },
      {
        title: "School vehicle statuses",
        items: [
          "Available: ready for assignment. Assigned: allocated to a trip. Maintenance: not available for new assignments. Inactive: not in service.",
        ],
      },
    ],
    note:
      "Without a vehicle, a trip can remain a draft or be marked preparing, but it cannot be confirmed or started. Paid trips require paid learners for confirmation/preparation; free trips require registered learners.",
  },
  "/tracking": {
    title: "Using Live Tracking",
    intro:
      "Live Tracking displays the latest location shared by school transport vehicles.",
    sections: [
      {
        title: "Reading the tracking view",
        items: [
          "Choose an active route or trip to inspect its vehicle and driver details.",
          "The map updates when new location information is received; a missing marker means a current location has not been shared.",
          "Use the selected vehicle panel for the available status and trip context.",
        ],
      },
      {
        title: "When location is unavailable",
        items: [
          "Confirm the trip is in progress and the driver has location permission enabled.",
          "Check that the device has network coverage and location services turned on.",
        ],
      },
    ],
  },
  "/attendance": {
    title: "Recording attendance",
    intro:
      "Use the attendance register to record each learner’s daily attendance and review school-wide totals.",
    sections: [
      {
        title: "Mark the register",
        items: [
          "Select the date and find learners using the available search or grade filters.",
          "Mark each learner Present, Late, or Absent. Review the saved register for unmarked learners.",
          "Use the overview to compare attendance records across the selected dates.",
        ],
      },
      {
        title: "Attendance statuses",
        items: [
          "Present: the learner attended.",
          "Late: the learner attended after the expected arrival time.",
          "Absent: the learner did not attend.",
          "Not recorded: no attendance status has been entered for that learner and date.",
        ],
      },
    ],
    note:
      "If the school has no students, the register and attendance percentages have no learner denominator and should be treated as unavailable rather than as 0% attendance.",
  },
  "/parents": {
    title: "Managing parents and guardians",
    intro:
      "The Parents page helps the school find family contacts and review the learners linked to each account.",
    sections: [
      {
        title: "Working with parent records",
        items: [
          "Search or filter the directory to find a parent or guardian.",
          "Review linked learners and contact details before communicating or changing a relationship.",
          "If a learner is missing, check the student record and its parent/guardian link.",
        ],
      },
    ],
    note:
      "Keep family contact information accurate so school messages and trip updates reach the right people.",
  },
  "/announcements": {
    title: "Creating announcements",
    intro:
      "Announcements share school updates with the intended parent, learner, or staff audience.",
    sections: [
      {
        title: "Draft and publish",
        items: [
          "Select New announcement, write a clear title and message, and choose the intended audience and category.",
          "Save a draft if the message is not ready. Review its audience and timing before publishing.",
          "Published announcements are delivered to the selected audience and appear in the announcement list.",
          "Use the overview and category summaries to review recent communication activity.",
        ],
      },
      {
        title: "Announcement states",
        items: [
          "Draft: saved for school review and not yet sent.",
          "Published/sent: delivered to the selected audience.",
          "Cancelled: withdrawn from further use where cancellation is available.",
        ],
      },
    ],
    note:
      "Check the audience and message details before sending. Published announcements may already have been seen by recipients.",
  },
  "/messages": {
    title: "Using school messages",
    intro:
      "Messages are conversations with parents and other linked users available to your school account.",
    sections: [
      {
        title: "Conversation workflow",
        items: [
          "Choose a conversation from the list to read its messages.",
          "Reply in the conversation thread; attach a file only when it is relevant and appropriate.",
          "Use the conversation’s read state to see which messages still need attention.",
        ],
      },
    ],
    note:
      "Messages are private communications. Do not include sensitive learner information unless it is necessary for the conversation.",
  },
  "/notifications": {
    title: "Managing notifications",
    intro:
      "Notifications highlight updates and actions that may need your attention.",
    sections: [
      {
        title: "Notification states",
        items: [
          "Unread: not yet marked as reviewed.",
          "Read: opened or marked as read.",
        ],
      },
      {
        title: "Review notifications",
        items: [
          "Open a notification to review its details and related record.",
          "Mark notifications as read after reviewing them to keep the unread list useful.",
        ],
      },
    ],
  },
  "/support": {
    title: "Getting school support",
    intro:
      "Create a support request when you need help with the portal or school transport workflows.",
    sections: [
      {
        title: "Support request workflow",
        items: [
          "Describe the issue, what you expected, and the steps that led to it. Include relevant non-sensitive details.",
          "Submit the request and follow its replies from Your requests.",
          "Reply in the same request to keep troubleshooting context together.",
        ],
      },
      {
        title: "Ticket statuses",
        items: [
          "Open: received and awaiting or undergoing review.",
          "In progress: support is working on the request.",
          "Resolved/closed: marked complete. Reply or create a new request if the issue returns.",
        ],
      },
    ],
  },
  "/reports": {
    title: "Using school reports",
    intro:
      "Reports summarise operational data and support quarterly learner progress reporting.",
    sections: [
      {
        title: "Operational reports",
        items: [
          "Use the report tabs and filters to review routes, attendance, students, drivers, and vehicles.",
          "Download the operational report when you need a copy of the currently displayed data.",
        ],
      },
      {
        title: "Quarterly learner reports",
        items: [
          "Create a report for a learner and academic quarter; enter subject marks, grades, pass marks, comments, and recommendations.",
          "Attendance counts are captured from the school register for that quarter. Review the snapshot and add absence notes.",
          "Save as Draft while work is in progress, or mark Published when ready to share.",
          "Download a PDF with school branding, a stamp area, and teacher/parent signature lines.",
        ],
      },
    ],
    note:
      "Check learner identity, academic year, quarter, subject marks, and attendance before publishing or distributing a report.",
  },
  "/incidents": {
    title: "Recording incidents",
    intro:
      "Use Incidents & reports to record safety or operational issues and follow their review.",
    sections: [
      {
        title: "Incident workflow",
        items: [
          "Record what happened, when and where it occurred, who was involved, and any immediate action taken.",
          "Choose the closest incident category and provide factual, concise details.",
          "Review the incident list and overview to monitor reports and follow-up.",
        ],
      },
    ],
    note:
      "For immediate danger or a medical emergency, contact local emergency services first; the portal is not an emergency response service.",
  },
  "/settings": {
    title: "Managing school settings",
    intro:
      "Settings contains your administrator profile, school information, and account preferences.",
    sections: [
      {
        title: "Keep your account current",
        items: [
          "Review administrator contact details and update your password from the account section.",
          "Maintain school identity, contact, location, and operating-hour details in the school profile.",
          "Save changes and confirm they appear in the profile before leaving the page.",
        ],
      },
    ],
    note:
      "Use a unique password and never share your sign-in credentials with other staff.",
  },
  "/members": {
    title: "Managing school staff",
    intro:
      "Staff Members lets the school manage staff access and responsibilities in the portal.",
    sections: [
      {
        title: "Member access",
        items: [
          "Add a member with the correct contact information, role, and access level.",
          "Grant only the access needed for the person’s duties.",
          "Update or deactivate access promptly when responsibilities change or a staff member leaves.",
        ],
      },
    ],
    note:
      "School management access can change school settings and records; assign it only to trusted administrators.",
  },
  "/billing": {
    title: "School subscription and billing",
    intro:
      "Billing shows your school’s plan, learner allowance, invoices, and payment options.",
    sections: [
      {
        title: "Plans and learner limits",
        items: [
          "Compare plan features and learner limits with your current school population.",
          "Choose a plan that supports your learner count before confirming checkout or an invoice request.",
          "Review the subscription state and renewal dates to avoid an interruption.",
        ],
      },
      {
        title: "Payments and invoices",
        items: [
          "Follow the selected payment method’s instructions. Card payments are handled through checkout; bank transfer payments require the invoice reference.",
          "Report a bank transfer against the matching invoice and allow the school billing team to confirm it.",
          "Download or review invoice details from payment history.",
        ],
      },
    ],
    note:
      "Subscription and learner-limit changes are enforced by the server; a cached plan display may take a moment to reflect a recent billing update.",
  },
};

function DocsButton({ className = "" }) {
  const { pathname } = useLocation();
  const [openForPath, setOpenForPath] = useState(null);
  const pagePath = pathname.replace(/\/+$/, "") || "/";
  const open = openForPath === pagePath;
  const pageName =
    pagePath
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.replaceAll("-", " ") || "school portal";
  const guide = pageGuides[pagePath] || {
    title: `Using ${pageName}`,
    intro:
      "Use this page to review and manage the school information shown here.",
    sections: [
      {
        title: "Getting started",
        items: [
          "Review the page summary and available filters before making changes.",
          "Use the page actions to add, update, or review school records.",
          "Check saved changes and any status indicators before leaving the page.",
        ],
      },
    ],
    note:
      "If you need help with a specific action, contact school support from the Support page.",
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpenForPath(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        className={`portal-docs-button${className ? ` ${className}` : ""}`}
        type="button"
        onClick={() => setOpenForPath(pagePath)}
        aria-haspopup="dialog"
        aria-label={`Open ${guide.title} documentation`}
      >
        <FiBookOpen aria-hidden="true" />
        Docs
      </button>
      {open && (
        <div
          className="portal-docs-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpenForPath(null);
          }}
        >
          <section
            className="portal-docs-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-docs-title"
          >
            <header className="portal-docs-heading">
              <div>
                <p className="page-kicker">SCHOOL PORTAL GUIDE</p>
                <h2 id="portal-docs-title">{guide.title}</h2>
                <p>{guide.intro}</p>
              </div>
              <button
                type="button"
                className="portal-docs-close"
                onClick={() => setOpenForPath(null)}
                aria-label="Close documentation"
              >
                <FiX />
              </button>
            </header>
            <div className="portal-docs-body">
              {guide.sections.map((section) => (
                <section key={section.title}>
                  <h3>{section.title}</h3>
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
              {guide.note && (
                <p className="portal-docs-note">{guide.note}</p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default DocsButton;
