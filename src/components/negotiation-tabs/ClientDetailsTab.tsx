import { ClientInfoCard } from './client-details/ClientInfoCard'
import { AddressCard } from './client-details/AddressCard'
import { UtilityCard } from './client-details/UtilityCard'
import { ConsumptionCard } from './client-details/ConsumptionCard'
import { TechnicalCard } from './client-details/TechnicalCard'

export function ClientDetailsTab({ neg, reload }: { neg: any; reload?: () => void }) {
  return (
    <div className="space-y-6">
      <ClientInfoCard neg={neg} reload={reload} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AddressCard neg={neg} reload={reload} />
        <UtilityCard neg={neg} reload={reload} />
        <TechnicalCard neg={neg} reload={reload} />
        <ConsumptionCard neg={neg} reload={reload} />
      </div>
    </div>
  )
}
