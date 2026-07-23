"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from '@/utils/supabase/client'
import BanknoteCard from "@/components/BanknoteCard"
import { Skeleton } from "@/components/ui/skeleton"
import { Banknote } from "@/lib/types"

interface RelatedBanknotesProps {
    currencyId: string
    currentBanknoteId: string
}

export function RelatedBanknotes({
    currencyId,
    currentBanknoteId,
}: RelatedBanknotesProps) {
    const supabase = createClient()
    const { data: relatedBanknotes = [], isLoading } = useQuery({
        queryKey: ["relatedBanknotes", currencyId, currentBanknoteId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("banknotes")
                .select(`
                  *,
                  currencies(name, code)
                `)
                .eq("currencyid", currencyId)
                .neq("banknoteid", currentBanknoteId)
                .order("year", { ascending: false })
                .limit(4)

            if (error) throw error
            return data as Banknote[]
        },
        enabled: !!currencyId && !!currentBanknoteId,
    })

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                ))}
            </div>
        )
    }

    if (relatedBanknotes.length === 0) {
        return <div className="text-muted-foreground italic">No other banknotes from this currency in your collection.</div>
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedBanknotes.map((banknote) => (
                <BanknoteCard banknote={banknote} key={banknote.banknoteid} />
            ))}
        </div>
    )
}
