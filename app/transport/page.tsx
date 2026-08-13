'use client'

import { useEffect, useMemo, useState } from 'react'
import { Page } from '@/components/ui'

type TransportTab = 'Tous' | 'Avion' | 'Bateau'
type PassengerType = 'Propriétaire' | 'Service'
type FreightValue = 'Oui' | 'Non'
type BoatStatus = 'Prévu' | 'Confirmé' | 'En route' | 'Arrivé' | 'Annulé'

type Flight = {
  id: string
  date: string
  flightNumber: string
  outboundDeparture: string
  outboundArrival: string
  returnDeparture: string
  returnArrival: string
  stopover: string
  freight: FreightValue
  passengerType: PassengerType
  passengerListTransmissionDate: string
  maxOutboundWeight: number
  maxOutboundVisitorPax: number
  maxOutboundResidentPax: number
  maxOutboundVT: number
  maxReturnWeight: number
  maxReturnVisitorPax: number
  maxReturnResidentPax: number
  maxReturnVT: number
  notes?: string
}

type Boat = {
  id: string
  boatName: string
  departureDate: string
  departureTime: string
  estimatedArrivalDate: string
  estimatedArrivalTime: string
  departurePlace: string
  destination: string
  freight: FreightValue
  status: BoatStatus
  notes?: string
}


const INITIAL_FLIGHTS: Flight[] = [
  {
    id: 'VOL-2026-08-19-179',
    date: '2026-08-19',
    flightNumber: '179',
    outboundDeparture: '13:00',
    outboundArrival: '14:45',
    returnDeparture: '16:15',
    returnArrival: '18:05',
    stopover: '01:30',
    freight: 'Oui',
    passengerType: 'Propriétaire',
    passengerListTransmissionDate: '2026-08-12',
    maxOutboundWeight: 3182,
    maxOutboundVisitorPax: 29,
    maxOutboundResidentPax: 30,
    maxOutboundVT: 2,
    maxReturnWeight: 4400,
    maxReturnVisitorPax: 41,
    maxReturnResidentPax: 42,
    maxReturnVT: 2,
    notes: '',
  },
  {
    id: 'VOL-2026-08-25-172',
    date: '2026-08-25',
    flightNumber: '172',
    outboundDeparture: '07:00',
    outboundArrival: '08:45',
    returnDeparture: '10:15',
    returnArrival: '12:05',
    stopover: '01:30',
    freight: 'Oui',
    passengerType: 'Service',
    passengerListTransmissionDate: '2026-08-18',
    maxOutboundWeight: 3182,
    maxOutboundVisitorPax: 29,
    maxOutboundResidentPax: 30,
    maxOutboundVT: 2,
    maxReturnWeight: 4400,
    maxReturnVisitorPax: 41,
    maxReturnResidentPax: 42,
    maxReturnVT: 2,
    notes: '',
  },
  {
    id: 'VOL-2026-08-29-179',
    date: '2026-08-29',
    flightNumber: '179',
    outboundDeparture: '13:00',
    outboundArrival: '14:45',
    returnDeparture: '16:15',
    returnArrival: '18:05',
    stopover: '01:30',
    freight: 'Oui',
    passengerType: 'Propriétaire',
    passengerListTransmissionDate: '2026-08-22',
    maxOutboundWeight: 3182,
    maxOutboundVisitorPax: 29,
    maxOutboundResidentPax: 30,
    maxOutboundVT: 2,
    maxReturnWeight: 4400,
    maxReturnVisitorPax: 41,
    maxReturnResidentPax: 42,
    maxReturnVT: 2,
    notes: '',
  },
  {
    id: 'VOL-2026-09-01-172',
    date: '2026-09-01',
    flightNumber: '172',
    outboundDeparture: '12:55',
    outboundArrival: '14:40',
    returnDeparture: '16:10',
    returnArrival: '18:00',
    stopover: '01:30',
    freight: 'Oui',
    passengerType: 'Service',
    passengerListTransmissionDate: '2026-08-25',
    maxOutboundWeight: 3182,
    maxOutboundVisitorPax: 29,
    maxOutboundResidentPax: 30,
    maxOutboundVT: 2,
    maxReturnWeight: 4400,
    maxReturnVisitorPax: 41,
    maxReturnResidentPax: 42,
    maxReturnVT: 2,
    notes: '',
  },
  {
    id: 'VOL-2026-09-08-178',
    date: '2026-09-08',
    flightNumber: '178',
    outboundDeparture: '07:00',
    outboundArrival: '08:45',
    returnDeparture: '10:15',
    returnArrival: '12:05',
    stopover: '01:30',
    freight: 'Oui',
    passengerType: 'Propriétaire',
    passengerListTransmissionDate: '2026-09-01',
    maxOutboundWeight: 3182,
    maxOutboundVisitorPax: 29,
    maxOutboundResidentPax: 30,
    maxOutboundVT: 2,
    maxReturnWeight: 4400,
    maxReturnVisitorPax: 41,
    maxReturnResidentPax: 42,
    maxReturnVT: 2,
    notes: '',
  },
  {
    id: 'VOL-2026-09-08-179',
    date: '2026-09-08',
    flightNumber: '179',
    outboundDeparture: '12:55',
    outboundArrival: '14:40',
    returnDeparture: '16:10',
    returnArrival: '18:00',
    stopover: '01:30',
    freight: 'Oui',
    passengerType: 'Propriétaire',
    passengerListTransmissionDate: '2026-09-01',
    maxOutboundWeight: 3182,
    maxOutboundVisitorPax: 29,
    maxOutboundResidentPax: 30,
    maxOutboundVT: 2,
    maxReturnWeight: 4400,
    maxReturnVisitorPax: 41,
    maxReturnResidentPax: 42,
    maxReturnVT: 2,
    notes: '',
  },
  {
    id: 'VOL-2026-09-12-172',
    date: '2026-09-12',
    flightNumber: '172',
    outboundDeparture: '13:10',
    outboundArrival: '14:55',
    returnDeparture: '16:25',
    returnArrival: '18:15',
    stopover: '01:30',
    freight: 'Oui',
    passengerType: 'Service',
    passengerListTransmissionDate: '2026-09-05',
    maxOutboundWeight: 3182,
    maxOutboundVisitorPax: 29,
    maxOutboundResidentPax: 30,
    maxOutboundVT: 2,
    maxReturnWeight: 4400,
    maxReturnVisitorPax: 41,
    maxReturnResidentPax: 42,
    maxReturnVT: 2,
    notes: '',
  },
  {
    id: 'VOL-2026-09-13-171',
    date: '2026-09-13',
    flightNumber: '171',
    outboundDeparture: '07:00',
    outboundArrival: '08:45',
    returnDeparture: '10:15',
    returnArrival: '12:05',
    stopover: '01:30',
    freight: 'Oui',
    passengerType: 'Service',
    passengerListTransmissionDate: '2026-09-06',
    maxOutboundWeight: 3182,
    maxOutboundVisitorPax: 29,
    maxOutboundResidentPax: 30,
    maxOutboundVT: 2,
    maxReturnWeight: 4400,
    maxReturnVisitorPax: 41,
    maxReturnResidentPax: 42,
    maxReturnVT: 2,
    notes: '',
  },
]

const STORAGE_FLIGHTS = 'nukustock_transport_flights_v1'
const STORAGE_BOATS = 'nukustock_transport_boats_v1'

const EMPTY_FLIGHT: Omit<Flight, 'id'> = {
  date: '',
  flightNumber: '',
  outboundDeparture: '',
  outboundArrival: '',
  returnDeparture: '',
  returnArrival: '',
  stopover: '01:30',
  freight: 'Oui',
  passengerType: 'Service',
  passengerListTransmissionDate: '',
  maxOutboundWeight: 3182,
  maxOutboundVisitorPax: 29,
  maxOutboundResidentPax: 30,
  maxOutboundVT: 2,
  maxReturnWeight: 4400,
  maxReturnVisitorPax: 41,
  maxReturnResidentPax: 42,
  maxReturnVT: 2,
  notes: '',
}

const EMPTY_BOAT: Omit<Boat, 'id'> = {
  boatName: '',
  departureDate: '',
  departureTime: '',
  estimatedArrivalDate: '',
  estimatedArrivalTime: '',
  departurePlace: 'Papeete',
  destination: 'Nukutepipi',
  freight: 'Oui',
  status: 'Prévu',
  notes: '',
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function displayDate(value: string) {
  if (!value) return '—'

  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function flightSortValue(flight: Flight) {
  return new Date(
    `${flight.date || '2100-01-01'}T${flight.outboundDeparture || '00:00'}`
  ).getTime()
}

export default function TransportPage() {
  const [tab, setTab] = useState<TransportTab>('Avion')
  const [flights, setFlights] = useState<Flight[]>([])
  const [boats, setBoats] = useState<Boat[]>([])

  const [flightOpen, setFlightOpen] = useState(false)
  const [boatOpen, setBoatOpen] = useState(false)

  const [editingFlightId, setEditingFlightId] = useState<string | null>(null)
  const [editingBoatId, setEditingBoatId] = useState<string | null>(null)

  const [flightForm, setFlightForm] =
    useState<Omit<Flight, 'id'>>(EMPTY_FLIGHT)

  const [boatForm, setBoatForm] =
    useState<Omit<Boat, 'id'>>(EMPTY_BOAT)

  useEffect(() => {
    try {
      const savedFlights = localStorage.getItem(STORAGE_FLIGHTS)
      const savedBoats = localStorage.getItem(STORAGE_BOATS)

      if (savedFlights) {
        const existing = JSON.parse(savedFlights) as Flight[]
        const ids = new Set(existing.map((flight) => flight.id))
        const missingInitialFlights = INITIAL_FLIGHTS.filter(
          (flight) => !ids.has(flight.id)
        )
        setFlights([...existing, ...missingInitialFlights])
      } else {
        setFlights(INITIAL_FLIGHTS)
      }

      if (savedBoats) setBoats(JSON.parse(savedBoats))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FLIGHTS, JSON.stringify(flights))
    } catch {}
  }, [flights])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BOATS, JSON.stringify(boats))
    } catch {}
  }, [boats])

  const sortedFlights = useMemo(
    () =>
      [...flights].sort(
        (a, b) => flightSortValue(a) - flightSortValue(b)
      ),
    [flights]
  )

  const sortedBoats = useMemo(
    () =>
      [...boats].sort(
        (a, b) =>
          new Date(
            `${a.departureDate || '2100-01-01'}T${a.departureTime || '00:00'}`
          ).getTime() -
          new Date(
            `${b.departureDate || '2100-01-01'}T${b.departureTime || '00:00'}`
          ).getTime()
      ),
    [boats]
  )

  const openNewFlight = () => {
    setEditingFlightId(null)
    setFlightForm(EMPTY_FLIGHT)
    setFlightOpen(true)
  }

  const editFlight = (flight: Flight) => {
    const { id, ...rest } = flight
    setEditingFlightId(id)
    setFlightForm(rest)
    setFlightOpen(true)
  }

  const saveFlight = () => {
    if (!flightForm.date || !flightForm.flightNumber) {
      window.alert('Renseigne au minimum la date et le numéro de vol.')
      return
    }

    if (editingFlightId) {
      setFlights((current) =>
        current.map((flight) =>
          flight.id === editingFlightId
            ? { id: editingFlightId, ...flightForm }
            : flight
        )
      )
    } else {
      setFlights((current) => [
        ...current,
        { id: makeId('VOL'), ...flightForm },
      ])
    }

    setFlightOpen(false)
    setEditingFlightId(null)
    setFlightForm(EMPTY_FLIGHT)
  }

  const deleteFlight = (id: string) => {
    if (!window.confirm('Supprimer ce vol ?')) return
    setFlights((current) => current.filter((flight) => flight.id !== id))
  }

  const openNewBoat = () => {
    setEditingBoatId(null)
    setBoatForm(EMPTY_BOAT)
    setBoatOpen(true)
  }

  const editBoat = (boat: Boat) => {
    const { id, ...rest } = boat
    setEditingBoatId(id)
    setBoatForm(rest)
    setBoatOpen(true)
  }

  const saveBoat = () => {
    if (!boatForm.boatName || !boatForm.departureDate) {
      window.alert('Renseigne au minimum le nom du bateau et la date de départ.')
      return
    }

    if (editingBoatId) {
      setBoats((current) =>
        current.map((boat) =>
          boat.id === editingBoatId
            ? { id: editingBoatId, ...boatForm }
            : boat
        )
      )
    } else {
      setBoats((current) => [
        ...current,
        { id: makeId('BAT'), ...boatForm },
      ])
    }

    setBoatOpen(false)
    setEditingBoatId(null)
    setBoatForm(EMPTY_BOAT)
  }

  const deleteBoat = (id: string) => {
    if (!window.confirm('Supprimer ce transport bateau ?')) return
    setBoats((current) => current.filter((boat) => boat.id !== id))
  }

  const showFlights = tab === 'Tous' || tab === 'Avion'
  const showBoats = tab === 'Tous' || tab === 'Bateau'

  const printFlights = () => {
    setTab('Avion')

    window.setTimeout(() => {
      window.print()
    }, 50)
  }

  return (
    <Page
      title="Transport"
      subtitle="Planning des affrètements avion et des transports bateau"
      action={
        <div className="transportActions">
          <button
            type="button"
            className="button secondary"
            onClick={openNewBoat}
          >
            + Bateau
          </button>

          <button
            type="button"
            className="button secondary"
            onClick={printFlights}
          >
            Imprimer les vols
          </button>

          <button
            type="button"
            className="button"
            onClick={openNewFlight}
          >
            + Nouveau vol
          </button>
        </div>
      }
    >
      <div className="transportTabs">
        {(['Tous', 'Avion', 'Bateau'] as TransportTab[]).map((item) => (
          <button
            type="button"
            key={item}
            className={tab === item ? 'active' : ''}
            onClick={() => setTab(item)}
          >
            {item === 'Avion'
              ? '✈ Avion'
              : item === 'Bateau'
              ? '⚓ Bateau'
              : 'Tous'}
          </button>
        ))}
      </div>

      <section className="flightPrintOnly">
        <div className="flightPrintHeader">
          <div>
            <div className="flightPrintEyebrow">NUKUTEPIPI</div>
            <h1>Planning des vols</h1>
          </div>
          <div className="flightPrintMeta">
            {sortedFlights.length} vol{sortedFlights.length > 1 ? 's' : ''}
          </div>
        </div>

        <table className="flightPrintTable">
          <thead>
            <tr>
              <th>N°</th>
              <th>Date</th>
              <th>Vol</th>
              <th>PPT → NKTP</th>
              <th>Escale</th>
              <th>NKTP → PPT</th>
              <th>Fret</th>
              <th>Passagers</th>
              <th>Transmission</th>
              <th>Capacité maxi</th>
            </tr>
          </thead>
          <tbody>
            {sortedFlights.length > 0 ? (
              sortedFlights.map((flight, index) => (
                <tr key={`print-${flight.id}`}>
                  <td>{index + 1}</td>
                  <td>{displayDate(flight.date)}</td>
                  <td><strong>{flight.flightNumber}</strong></td>
                  <td>
                    {flight.outboundDeparture || '—'}
                    {' → '}
                    {flight.outboundArrival || '—'}
                  </td>
                  <td>{flight.stopover || '—'}</td>
                  <td>
                    {flight.returnDeparture || '—'}
                    {' → '}
                    {flight.returnArrival || '—'}
                  </td>
                  <td>{flight.freight}</td>
                  <td>{flight.passengerType}</td>
                  <td>{displayDate(flight.passengerListTransmissionDate)}</td>
                  <td>
                    <div>
                      PPT→NKTP : {flight.maxOutboundWeight} kg ·
                      {' '}
                      {flight.maxOutboundVisitorPax}/{flight.maxOutboundResidentPax}
                      {flight.maxOutboundVT > 0 ? ` + ${flight.maxOutboundVT} VT` : ''}
                    </div>
                    <div>
                      NKTP→PPT : {flight.maxReturnWeight} kg ·
                      {' '}
                      {flight.maxReturnVisitorPax}/{flight.maxReturnResidentPax}
                      {flight.maxReturnVT > 0 ? ` + ${flight.maxReturnVT} VT` : ''}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>Aucun vol enregistré.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {showFlights && (
        <section className="transportSection">
          <div className="transportSectionHeader">
            <div>
              <div className="transportEyebrow">NUKUTEPIPI</div>
              <h2>Affrètements Air Tahiti</h2>
            </div>

            <div className="transportCount">
              {flights.length} vol{flights.length > 1 ? 's' : ''}
            </div>
          </div>

          <div className="transportTableWrap">
            <table className="flightTable">
              <thead>
                <tr>
                  <th rowSpan={2}>N°</th>
                  <th rowSpan={2}>DATE</th>
                  <th rowSpan={2}>Numéro<br />de vol</th>
                  <th colSpan={3}>HORAIRES</th>
                  <th rowSpan={2}>FRET</th>
                  <th rowSpan={2}>PASSAGERS</th>
                  <th rowSpan={2}>TRANSMISSION LISTES<br />DE PASSAGERS</th>
                  <th rowSpan={2}>
                    CAPACITÉ MAXI<br />
                    <small>Poids - Pax Visit/Resid</small>
                  </th>
                  <th rowSpan={2}>ACTIONS</th>
                </tr>
                <tr>
                  <th>Décollage</th>
                  <th>Atterrissage</th>
                  <th>Escale</th>
                </tr>
              </thead>

              <tbody>
                {sortedFlights.length > 0 ? (
                  sortedFlights.map((flight, index) => (
                    <tr key={flight.id}>
                      <td className="centerCell">{index + 1}</td>
                      <td className="dateCell">{displayDate(flight.date)}</td>
                      <td className="centerCell flightNumber">
                        {flight.flightNumber}
                      </td>

                      <td className="scheduleCell">
                        <div><strong>PPT</strong> {flight.outboundDeparture || '—'}</div>
                        <div><strong>NKTP</strong> {flight.returnDeparture || '—'}</div>
                      </td>

                      <td className="scheduleCell">
                        <div><strong>NKTP</strong> {flight.outboundArrival || '—'}</div>
                        <div><strong>PPT</strong> {flight.returnArrival || '—'}</div>
                      </td>

                      <td className="centerCell">{flight.stopover || '—'}</td>

                      <td className="twoLineCell centerCell">
                        <div>{flight.freight}</div>
                        <div>—</div>
                      </td>

                      <td className="twoLineCell centerCell">
                        <div>{flight.passengerType}</div>
                        <div>{flight.passengerType}</div>
                      </td>

                      <td className="centerCell transmissionCell">
                        {displayDate(flight.passengerListTransmissionDate)}
                      </td>

                      <td className="capacityCell">
                        <div>
                          <strong>{flight.maxOutboundWeight} Kg</strong>
                          <span>
                            {flight.maxOutboundVisitorPax}/{flight.maxOutboundResidentPax}
                            {flight.maxOutboundVT > 0
                              ? ` + ${flight.maxOutboundVT} VT`
                              : ''}
                          </span>
                        </div>

                        <div>
                          <strong>{flight.maxReturnWeight} Kg</strong>
                          <span>
                            {flight.maxReturnVisitorPax}/{flight.maxReturnResidentPax}
                            {flight.maxReturnVT > 0
                              ? ` + ${flight.maxReturnVT} VT`
                              : ''}
                          </span>
                        </div>
                      </td>

                      <td className="actionCell">
                        <button
                          type="button"
                          onClick={() => editFlight(flight)}
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          className="dangerText"
                          onClick={() => deleteFlight(flight.id)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="emptyCell">
                      Aucun vol enregistré. Clique sur « + Nouveau vol ».
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {showBoats && (
        <section className="transportSection boatSection">
          <div className="transportSectionHeader">
            <div>
              <div className="transportEyebrow">NUKUTEPIPI</div>
              <h2>Transports bateau</h2>
            </div>

            <div className="transportCount">
              {boats.length} transport{boats.length > 1 ? 's' : ''}
            </div>
          </div>

          <div className="transportTableWrap">
            <table className="boatTable">
              <thead>
                <tr>
                  <th>NOM DU BATEAU</th>
                  <th>DÉPART</th>
                  <th>ARRIVÉE POTENTIELLE</th>
                  <th>TRAJET</th>
                  <th>FRET</th>
                  <th>STATUT</th>
                  <th>NOTES</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>

              <tbody>
                {sortedBoats.length > 0 ? (
                  sortedBoats.map((boat) => (
                    <tr key={boat.id}>
                      <td><strong>{boat.boatName}</strong></td>
                      <td>
                        {displayDate(boat.departureDate)}
                        {boat.departureTime ? ` · ${boat.departureTime}` : ''}
                      </td>
                      <td>
                        {displayDate(boat.estimatedArrivalDate)}
                        {boat.estimatedArrivalTime
                          ? ` · ${boat.estimatedArrivalTime}`
                          : ''}
                      </td>
                      <td>
                        {boat.departurePlace || '—'} → {boat.destination || '—'}
                      </td>
                      <td className="centerCell">{boat.freight}</td>
                      <td>
                        <span className={`statusPill status-${boat.status}`}>
                          {boat.status}
                        </span>
                      </td>
                      <td>{boat.notes || '—'}</td>
                      <td className="actionCell">
                        <button
                          type="button"
                          onClick={() => editBoat(boat)}
                        >
                          Modifier
                        </button>

                        <button
                          type="button"
                          className="dangerText"
                          onClick={() => deleteBoat(boat.id)}
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="emptyCell">
                      Aucun transport bateau enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {flightOpen && (
        <div className="transportModalBackdrop">
          <div className="transportModal">
            <div className="modalHeader">
              <div>
                <div className="transportEyebrow">AVION</div>
                <h2>{editingFlightId ? 'Modifier le vol' : 'Nouveau vol'}</h2>
              </div>

              <button
                type="button"
                className="modalClose"
                onClick={() => setFlightOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="formGrid">
              <Field label="Date du vol *">
                <input
                  type="date"
                  value={flightForm.date}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      date: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Numéro de vol *">
                <input
                  value={flightForm.flightNumber}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      flightNumber: e.target.value,
                    }))
                  }
                  placeholder="Ex. 176"
                />
              </Field>

              <Field label="Départ PPT">
                <input
                  type="time"
                  value={flightForm.outboundDeparture}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      outboundDeparture: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Arrivée NKTP">
                <input
                  type="time"
                  value={flightForm.outboundArrival}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      outboundArrival: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Départ NKTP">
                <input
                  type="time"
                  value={flightForm.returnDeparture}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      returnDeparture: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Arrivée PPT">
                <input
                  type="time"
                  value={flightForm.returnArrival}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      returnArrival: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Temps d'escale">
                <input
                  type="time"
                  value={flightForm.stopover}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      stopover: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Fret">
                <select
                  value={flightForm.freight}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      freight: e.target.value as FreightValue,
                    }))
                  }
                >
                  <option value="Oui">Oui</option>
                  <option value="Non">Non</option>
                </select>
              </Field>

              <Field label="Passagers">
                <select
                  value={flightForm.passengerType}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      passengerType: e.target.value as PassengerType,
                    }))
                  }
                >
                  <option value="Propriétaire">Propriétaire</option>
                  <option value="Service">Service</option>
                </select>
              </Field>

              <Field label="Transmission liste passagers">
                <input
                  type="date"
                  value={flightForm.passengerListTransmissionDate}
                  onChange={(e) =>
                    setFlightForm((current) => ({
                      ...current,
                      passengerListTransmissionDate: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <div className="capacityEditor">
              <h3>Capacité maximale PPT → NKTP</h3>

              <div className="formGrid capacityGrid">
                <NumberField
                  label="Poids max. (kg)"
                  value={flightForm.maxOutboundWeight}
                  onChange={(value) =>
                    setFlightForm((current) => ({
                      ...current,
                      maxOutboundWeight: value,
                    }))
                  }
                />

                <NumberField
                  label="Pax visiteurs"
                  value={flightForm.maxOutboundVisitorPax}
                  onChange={(value) =>
                    setFlightForm((current) => ({
                      ...current,
                      maxOutboundVisitorPax: value,
                    }))
                  }
                />

                <NumberField
                  label="Pax résidents"
                  value={flightForm.maxOutboundResidentPax}
                  onChange={(value) =>
                    setFlightForm((current) => ({
                      ...current,
                      maxOutboundResidentPax: value,
                    }))
                  }
                />

                <NumberField
                  label="VT"
                  value={flightForm.maxOutboundVT}
                  onChange={(value) =>
                    setFlightForm((current) => ({
                      ...current,
                      maxOutboundVT: value,
                    }))
                  }
                />
              </div>

              <h3>Capacité maximale NKTP → PPT</h3>

              <div className="formGrid capacityGrid">
                <NumberField
                  label="Poids max. (kg)"
                  value={flightForm.maxReturnWeight}
                  onChange={(value) =>
                    setFlightForm((current) => ({
                      ...current,
                      maxReturnWeight: value,
                    }))
                  }
                />

                <NumberField
                  label="Pax visiteurs"
                  value={flightForm.maxReturnVisitorPax}
                  onChange={(value) =>
                    setFlightForm((current) => ({
                      ...current,
                      maxReturnVisitorPax: value,
                    }))
                  }
                />

                <NumberField
                  label="Pax résidents"
                  value={flightForm.maxReturnResidentPax}
                  onChange={(value) =>
                    setFlightForm((current) => ({
                      ...current,
                      maxReturnResidentPax: value,
                    }))
                  }
                />

                <NumberField
                  label="VT"
                  value={flightForm.maxReturnVT}
                  onChange={(value) =>
                    setFlightForm((current) => ({
                      ...current,
                      maxReturnVT: value,
                    }))
                  }
                />
              </div>
            </div>

            <Field label="Notes">
              <textarea
                rows={3}
                value={flightForm.notes || ''}
                onChange={(e) =>
                  setFlightForm((current) => ({
                    ...current,
                    notes: e.target.value,
                  }))
                }
              />
            </Field>

            <div className="modalActions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setFlightOpen(false)}
              >
                Annuler
              </button>

              <button
                type="button"
                className="button"
                onClick={saveFlight}
              >
                Enregistrer le vol
              </button>
            </div>
          </div>
        </div>
      )}

      {boatOpen && (
        <div className="transportModalBackdrop">
          <div className="transportModal">
            <div className="modalHeader">
              <div>
                <div className="transportEyebrow">BATEAU</div>
                <h2>
                  {editingBoatId
                    ? 'Modifier le transport'
                    : 'Nouveau transport bateau'}
                </h2>
              </div>

              <button
                type="button"
                className="modalClose"
                onClick={() => setBoatOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="formGrid">
              <Field label="Nom du bateau *">
                <input
                  value={boatForm.boatName}
                  onChange={(e) =>
                    setBoatForm((current) => ({
                      ...current,
                      boatName: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Fret">
                <select
                  value={boatForm.freight}
                  onChange={(e) =>
                    setBoatForm((current) => ({
                      ...current,
                      freight: e.target.value as FreightValue,
                    }))
                  }
                >
                  <option value="Oui">Oui</option>
                  <option value="Non">Non</option>
                </select>
              </Field>

              <Field label="Date de départ *">
                <input
                  type="date"
                  value={boatForm.departureDate}
                  onChange={(e) =>
                    setBoatForm((current) => ({
                      ...current,
                      departureDate: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Heure de départ">
                <input
                  type="time"
                  value={boatForm.departureTime}
                  onChange={(e) =>
                    setBoatForm((current) => ({
                      ...current,
                      departureTime: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Date potentielle d'arrivée">
                <input
                  type="date"
                  value={boatForm.estimatedArrivalDate}
                  onChange={(e) =>
                    setBoatForm((current) => ({
                      ...current,
                      estimatedArrivalDate: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Heure potentielle d'arrivée">
                <input
                  type="time"
                  value={boatForm.estimatedArrivalTime}
                  onChange={(e) =>
                    setBoatForm((current) => ({
                      ...current,
                      estimatedArrivalTime: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Lieu de départ">
                <input
                  value={boatForm.departurePlace}
                  onChange={(e) =>
                    setBoatForm((current) => ({
                      ...current,
                      departurePlace: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Destination">
                <input
                  value={boatForm.destination}
                  onChange={(e) =>
                    setBoatForm((current) => ({
                      ...current,
                      destination: e.target.value,
                    }))
                  }
                />
              </Field>

              <Field label="Statut">
                <select
                  value={boatForm.status}
                  onChange={(e) =>
                    setBoatForm((current) => ({
                      ...current,
                      status: e.target.value as BoatStatus,
                    }))
                  }
                >
                  <option value="Prévu">Prévu</option>
                  <option value="Confirmé">Confirmé</option>
                  <option value="En route">En route</option>
                  <option value="Arrivé">Arrivé</option>
                  <option value="Annulé">Annulé</option>
                </select>
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                rows={4}
                value={boatForm.notes || ''}
                onChange={(e) =>
                  setBoatForm((current) => ({
                    ...current,
                    notes: e.target.value,
                  }))
                }
              />
            </Field>

            <div className="modalActions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setBoatOpen(false)}
              >
                Annuler
              </button>

              <button
                type="button"
                className="button"
                onClick={saveBoat}
              >
                Enregistrer le bateau
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .transportActions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .flightPrintOnly {
          display: none;
        }

        .transportTabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .transportTabs button {
          border: 1px solid #d0d5dd;
          background: #fff;
          color: #344054;
          border-radius: 10px;
          padding: 9px 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .transportTabs button.active {
          background: #101828;
          color: #fff;
          border-color: #101828;
        }

        .transportSection {
          overflow: hidden;
          border: 1px solid #dfe3e8;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(16,24,40,.04);
          margin-bottom: 18px;
        }

        .transportSectionHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 18px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .transportSectionHeader h2,
        .modalHeader h2 {
          margin: 3px 0 0;
        }

        .transportEyebrow {
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
          color: #667085;
        }

        .transportCount {
          padding: 7px 10px;
          border-radius: 999px;
          background: #f2f4f7;
          color: #475467;
          font-size: 11px;
          font-weight: 800;
        }

        .transportTableWrap {
          width: 100%;
          overflow-x: auto;
        }

        .flightTable,
        .boatTable {
          width: 100%;
          border-collapse: collapse;
          min-width: 1180px;
        }

        .flightTable th,
        .boatTable th {
          background: #4a1e0c;
          color: #fff;
          border: 1px solid rgba(255,255,255,.22);
          padding: 9px 8px;
          font-size: 10px;
          font-weight: 900;
          text-align: center;
          vertical-align: middle;
        }

        .flightTable td,
        .boatTable td {
          border: 1px solid #d6d9de;
          padding: 8px;
          color: #101828;
          font-size: 11px;
          vertical-align: middle;
        }

        .flightTable tbody tr:nth-child(even),
        .boatTable tbody tr:nth-child(even) {
          background: #f7f0e8;
        }

        .flightTable tbody tr:nth-child(odd),
        .boatTable tbody tr:nth-child(odd) {
          background: #f7fbfc;
        }

        .centerCell {
          text-align: center;
        }

        .dateCell {
          min-width: 170px;
          text-align: center;
          font-weight: 700;
          text-transform: lowercase;
        }

        .flightNumber {
          font-size: 13px !important;
          font-weight: 900;
        }

        .scheduleCell {
          min-width: 105px;
          padding: 0 !important;
        }

        .scheduleCell > div,
        .twoLineCell > div,
        .capacityCell > div {
          min-height: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 5px 7px;
        }

        .scheduleCell > div + div,
        .twoLineCell > div + div,
        .capacityCell > div + div {
          border-top: 1px solid #d6d9de;
        }

        .capacityCell {
          min-width: 150px;
          padding: 0 !important;
        }

        .capacityCell > div {
          justify-content: space-between;
        }

        .capacityCell span {
          white-space: nowrap;
        }

        .transmissionCell {
          min-width: 160px;
        }

        .actionCell {
          min-width: 90px;
          text-align: center;
        }

        .actionCell button {
          display: block;
          width: 100%;
          border: 0;
          background: transparent;
          color: #344054;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          padding: 4px;
        }

        .actionCell .dangerText {
          color: #b42318;
        }

        .emptyCell {
          padding: 28px !important;
          text-align: center;
          color: #667085 !important;
          background: #fff;
        }

        .statusPill {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 999px;
          background: #f2f4f7;
          font-size: 10px;
          font-weight: 800;
          white-space: nowrap;
        }

        .transportModalBackdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(16,24,40,.55);
          overflow-y: auto;
        }

        .transportModal {
          width: min(920px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          background: #fff;
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 25px 80px rgba(16,24,40,.28);
        }

        .modalHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
        }

        .modalClose {
          width: 36px;
          height: 36px;
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          background: #fff;
          cursor: pointer;
          font-size: 20px;
        }

        .formGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .transportField {
          display: block;
          margin-bottom: 12px;
        }

        .transportField > span {
          display: block;
          margin-bottom: 6px;
          color: #344054;
          font-size: 11px;
          font-weight: 800;
        }

        .transportField input,
        .transportField select,
        .transportField textarea {
          width: 100%;
          border: 1px solid #d0d5dd;
          border-radius: 10px;
          background: #fff;
          color: #101828;
          padding: 10px;
          font: inherit;
        }

        .transportField input,
        .transportField select {
          min-height: 42px;
        }

        .capacityEditor {
          margin: 8px 0 14px;
          padding: 14px;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          background: #f9fafb;
        }

        .capacityEditor h3 {
          margin: 4px 0 12px;
          font-size: 13px;
        }

        .capacityEditor h3:not(:first-child) {
          margin-top: 16px;
        }

        .capacityGrid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .modalActions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }

        @media (max-width: 760px) {
          .transportActions {
            width: 100%;
          }

          .transportActions .button {
            flex: 1;
          }

          .formGrid,
          .capacityGrid {
            grid-template-columns: 1fr;
          }

          .transportModalBackdrop {
            padding: 8px;
          }

          .transportModal {
            max-height: calc(100dvh - 16px);
            border-radius: 14px;
            padding: 14px;
          }
        }

        @page {
          size: A4 landscape;
          margin: 9mm;
        }

        @media print {
          html,
          body {
            width: 297mm !important;
            min-width: 0 !important;
            max-width: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .nskSidebar,
          .nskTopbar,
          .nskMobileNav,
          .transportTabs,
          .transportActions,
          .transportSection,
          .transportModalBackdrop,
          .pageHead {
            display: none !important;
          }

          .nskMain {
            margin-left: 0 !important;
          }

          .nskViewStage,
          .nskViewCanvas,
          .page {
            width: 100% !important;
            max-width: none !important;
            min-width: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #fff !important;
          }

          .flightPrintOnly {
            display: block !important;
            width: 100%;
            color: #000;
            background: #fff;
          }

          .flightPrintHeader {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 10px;
            margin-bottom: 8mm;
            padding-bottom: 3mm;
            border-bottom: 1px solid #000;
          }

          .flightPrintHeader h1 {
            margin: 1mm 0 0;
            font-size: 18pt;
          }

          .flightPrintEyebrow {
            font-size: 8pt;
            font-weight: 800;
            letter-spacing: .12em;
          }

          .flightPrintMeta {
            font-size: 9pt;
            font-weight: 800;
          }

          .flightPrintTable {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            font-size: 6.8pt;
          }

          .flightPrintTable th,
          .flightPrintTable td {
            border: 0.35mm solid #444;
            padding: 1.6mm 1.2mm;
            vertical-align: middle;
            overflow-wrap: anywhere;
          }

          .flightPrintTable th {
            background: #eee !important;
            color: #000 !important;
            font-size: 6.5pt;
            font-weight: 900;
            text-align: center;
          }

          .flightPrintTable td {
            text-align: center;
          }

          .flightPrintTable th:nth-child(1),
          .flightPrintTable td:nth-child(1) {
            width: 5%;
          }

          .flightPrintTable th:nth-child(2),
          .flightPrintTable td:nth-child(2) {
            width: 13%;
          }

          .flightPrintTable th:nth-child(3),
          .flightPrintTable td:nth-child(3) {
            width: 7%;
          }

          .flightPrintTable th:nth-child(4),
          .flightPrintTable td:nth-child(4),
          .flightPrintTable th:nth-child(6),
          .flightPrintTable td:nth-child(6) {
            width: 10%;
          }

          .flightPrintTable th:nth-child(5),
          .flightPrintTable td:nth-child(5) {
            width: 7%;
          }

          .flightPrintTable th:nth-child(7),
          .flightPrintTable td:nth-child(7) {
            width: 6%;
          }

          .flightPrintTable th:nth-child(8),
          .flightPrintTable td:nth-child(8) {
            width: 10%;
          }

          .flightPrintTable th:nth-child(9),
          .flightPrintTable td:nth-child(9) {
            width: 13%;
          }

          .flightPrintTable th:nth-child(10),
          .flightPrintTable td:nth-child(10) {
            width: 19%;
          }

          .flightPrintTable tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </Page>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="transportField">
      <span>{label}</span>
      {children}
    </label>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(event) =>
          onChange(Number(event.target.value) || 0)
        }
      />
    </Field>
  )
}