import React from "react";

const ProjectPlanning = () => {
  const projects = [
    {
      id: "PRJ-2026-018",
      status: "ON TRACK",
      statusClass: "on-track",
      name: "ERP Phase 2 Rollout",
      pm: "Arjun Mehta",
      dates: "01 Apr 2026 → 30 Sep 2026",
      budget: "₹45L",
      spent: "₹28L",
      progress: 62,
      team: ["AM", "AK", "RV", "DR"],
    },
    {
      id: "PRJ-2026-017",
      status: "AT RISK",
      statusClass: "at-risk",
      client: "Bajaj Auto Ltd",
      name: "Bajaj Auto — Custom Integration",
      pm: "Ananya Singh",
      dates: "01 May 2026 → 15 Aug 2026",
      budget: "₹18L",
      spent: "₹17L",
      progress: 94,
      team: ["AS", "AK"],
    },
    {
      id: "PRJ-2026-016",
      status: "ON TRACK",
      statusClass: "on-track",
      name: "Factory Floor Automation",
      pm: "Vikram Joshi",
      dates: "15 Jun 2026 → 31 Dec 2026",
      budget: "₹80L",
      spent: "₹22L",
      progress: 28,
      team: ["VJ", "DP"],
    },
    {
      id: "PRJ-2026-015",
      status: "COMPLETED",
      statusClass: "completed",
      client: "Godrej Industries",
      name: "Godrej Supply Chain Portal",
      pm: "Rohan Verma",
      dates: "01 Mar 2026 → 31 Jul 2026",
      budget: "₹12L",
      spent: "₹12L",
      progress: 100,
      team: ["RV", "AS", "AK"],
    },
  ];

  return (
    <div className="projects-page">
      <div className="projects-inner">
        <section className="projects-list">
          {projects.map((project) => (
            <article className="project-card" key={project.id}>
              <div className="project-main">
                <div className="project-meta">
                  <span>{project.id}</span>
                  <span className={`project-status ${project.statusClass}`}>{project.status}</span>
                  {project.client && <span className="project-client">{project.client}</span>}
                </div>

                <h2>{project.name}</h2>

                <div className="project-details">
                  <span>PM: {project.pm}</span>
                  <span>{project.dates}</span>
                  <span>Budget: {project.budget}</span>
                  <span>Spent: {project.spent}</span>

                  <div className="project-team">
                    {project.team.map((member, i) => (
                      <span key={`${member}-${i}`}>{member}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="project-progress-value">
                <strong>{project.progress}%</strong>
                <span>COMPLETE</span>
                <button type="button" className="project-arrow" aria-label="Open project">›</button>
              </div>

              <div className="project-progress-track">
                <div
                  className={`project-progress-fill ${project.statusClass}`}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </article>
          ))}

          <button className="new-project-placeholder" type="button">
            + New Project
          </button>
        </section>
      </div>

      <style>{`
        .projects-page {
          width: 100%;
          min-height: 100%;
          background: #f5f4ef;
          color: #11140f;
          font-family: var(--sans, "DM Sans", system-ui, sans-serif);
          box-sizing: border-box;
        }

        .projects-inner {
          width: 100%;
          max-width: none ;
          margin: 0 auto;
          padding: 0 0 36px ;
          box-sizing: border-box;
        }

        .projects-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .project-card {
          position: relative;
          min-height: 175px;
          padding: 30px 25px 30px;
          background: #fff;
          border: 1px solid #e1dfd8;
          border-radius: 15px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 115px;
          gap: 20px;
          box-sizing: border-box;
          overflow: hidden;
        }

        .project-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 6px;
          font-family: monospace;
          font-size: 8px;
          color: #b0aba2;
        }

        .project-status,
        .project-client {
          min-height: 22px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 9px;
          white-space: nowrap;
        }

        .project-status.on-track {
          background: #e7eee2;
          color: #5b6e57;
        }

        .project-status.at-risk {
          background: #ece7d8;
          color: #8c7c4c;
        }

        .project-status.completed {
          background: #e4eee3;
          color: #4e6a4d;
        }

        .project-client {
          background: #f1f1f4;
          color: #7e8292;
        }

        .project-main h2 {
          margin: 0 0 10px;
          font-family: var(--serif, "DM Serif Display", Georgia, serif);
          font-size: 19px;
          line-height: 1.15;
          font-weight: 400;
        }

        .project-details {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
          font-family: monospace;
          font-size: 8px;
          color: #8d8981;
        }

        .project-team {
          display: flex;
          align-items: center;
          padding-left: 3px;
        }

        .project-team span {
          width: 17px;
          height: 17px;
          margin-left: -3px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
          border-radius: 50%;
          background: #edf0e9;
          color: #7d817a;
          font-size: 6px;
          box-sizing: border-box;
        }

        .project-progress-value {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding-top: 2px;
        }

        .project-progress-value strong {
          font-family: var(--serif, "DM Serif Display", Georgia, serif);
          font-size: 30px;
          line-height: 1;
          font-weight: 400;
        }

        .project-progress-value span {
          margin-top: 4px;
          font-size: 8px;
          color: #aaa69f;
        }

        .project-arrow {
          position: absolute;
          top: 3px;
          right: -2px;
          border: 0;
          background: transparent;
          color: #c9c7c1;
          font-size: 27px;
          line-height: 1;
          cursor: pointer;
        }

        .project-progress-track {
          position: absolute;
          left: 20px;
          right: 20px;
          bottom: 18px;
          height: 8px;
          border-radius: 6px;
          background: #f0efeb;
          overflow: hidden;
        }

        .project-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #a6bc98;
        }

        .project-progress-fill.at-risk {
          background: #ab9e70;
        }

        .project-progress-fill.completed {
          background: #9eb591;
        }

        .new-project-placeholder {
          min-height: 70px;
          border: 2px dashed #e3e0d8;
          border-radius: 15px;
          background: transparent;
          color: #aaa69f;
          font-family: monospace;
          font-size: 9px;
          cursor: pointer;
        }

        button:focus-visible {
          outline: 2px solid #a0b290;
          outline-offset: 2px;
        }


        @media (max-width: 780px) {
          .projects-inner {
            padding: 20px 16px 36px;
          }

          .projects-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .projects-actions {
            width: 100%;
          }

          .projects-actions button {
            flex: 1;
          }

          .projects-tabs {
            overflow-x: auto;
            white-space: nowrap;
          }

          .project-card {
            grid-template-columns: 1fr;
          }

          .project-progress-value {
            align-items: flex-start;
            padding-bottom: 5px;
          }

          .project-arrow {
            right: 0;
          }
        }

        @media (max-width: 560px) {
          .projects-kpis {
            grid-template-columns: 1fr;
          }

          .projects-actions {
            flex-wrap: wrap;
          }

          .projects-actions button {
            flex: 1 1 calc(50% - 4px);
          }

          .projects-header h1 {
            font-size: 25px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProjectPlanning;