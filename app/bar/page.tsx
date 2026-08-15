'use client'

import Link from 'next/link'

export default function BarPage() {
  return (
    <main className="barPage">
      <section className="barHero">
        <div>
          <span className="eyebrow">NUKUTEPIPI</span>
          <h1>Bar Nuku</h1>
          <p>Portail de l’équipe Bar</p>
        </div>

        <div className="status">
          <span className="statusDot" />
          Service actif
        </div>
      </section>

      <section className="barGrid">
        <Link href="/planning-bar" className="barCard">
          <div className="barIcon">▦</div>

          <div>
            <h2>Planning</h2>
            <p>Consulter le planning de l’équipe Bar.</p>
          </div>

          <span className="arrow">→</span>
        </Link>

        <Link href="/setup" className="barCard">
          <div className="barIcon">◫</div>

          <div>
            <h2>SET UP</h2>
            <p>Consulter les fiches et configurations des bars.</p>
          </div>

          <span className="arrow">→</span>
        </Link>
      </section>

      <section className="barInfo">
        <span>BAR TEAM</span>
        <strong>Bienvenue sur Bar Nuku</strong>

        <p>
          Cet espace est destiné à l’équipe Bar de Nukutepipi.
        </p>
      </section>

      <style>{`
        .barPage {
          min-height: 100vh;
          padding: 32px;
          background: #f4f6f9;
          color: #101828;
        }

        .barHero {
          max-width: 1100px;
          margin: 0 auto 24px;
          padding: 28px 30px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-radius: 20px;
          background: #0c1525;
          color: #fff;
          box-shadow: 0 14px 35px rgba(15, 23, 42, 0.12);
        }

        .eyebrow {
          display: block;
          margin-bottom: 6px;
          color: #98a2b3;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .barHero h1 {
          margin: 0;
          font-size: 34px;
          line-height: 1.1;
        }

        .barHero p {
          margin: 8px 0 0;
          color: #a7b3c6;
          font-size: 14px;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 999px;
          background: rgba(255,255,255,.06);
          color: #e5e7eb;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .statusDot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
        }

        .barGrid {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .barCard {
          min-height: 150px;
          padding: 22px;
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr) auto;
          align-items: center;
          gap: 16px;
          border: 1px solid #e4e7ec;
          border-radius: 18px;
          background: #fff;
          color: #101828;
          text-decoration: none;
          transition:
            transform .15s ease,
            box-shadow .15s ease,
            border-color .15s ease;
        }

        .barCard:hover {
          transform: translateY(-2px);
          border-color: #cbd5e1;
          box-shadow: 0 12px 30px rgba(15, 23, 42, .08);
        }

        .barIcon {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #eef2f6;
          font-size: 23px;
        }

        .barCard h2 {
          margin: 0;
          font-size: 18px;
        }

        .barCard p {
          margin: 6px 0 0;
          color: #667085;
          font-size: 12px;
          line-height: 1.5;
        }

        .arrow {
          color: #98a2b3;
          font-size: 22px;
        }

        .barInfo {
          max-width: 1100px;
          margin: 16px auto 0;
          padding: 22px;
          border: 1px solid #e4e7ec;
          border-radius: 18px;
          background: #fff;
          display: flex;
          flex-direction: column;
        }

        .barInfo > span {
          color: #98a2b3;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .barInfo strong {
          margin-top: 5px;
          font-size: 16px;
        }

        .barInfo p {
          margin: 6px 0 0;
          color: #667085;
          font-size: 12px;
        }

        @media (max-width: 760px) {
          .barPage {
            padding: 16px;
          }

          .barHero {
            padding: 22px;
            align-items: flex-start;
            flex-direction: column;
          }

          .barHero h1 {
            font-size: 28px;
          }

          .barGrid {
            grid-template-columns: 1fr;
          }

          .barCard {
            min-height: 125px;
          }
        }
      `}</style>
    </main>
  )
}