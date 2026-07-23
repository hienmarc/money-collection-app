import Link from "next/link"
import Image from "next/image"
import { CreditCard } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Banknote } from "@/lib/types"

export default function BanknoteCard({ banknote }: { banknote: Banknote }) {
    return (
        <Link href={`/banknotes/${banknote.banknoteid}`} key={banknote.banknoteid}>
            <Card className="h-full hover:shadow-md transition-shadow">
                <div className="relative aspect-[5/3] w-full overflow-hidden">
                    {banknote.front_image ? (
                        <Image
                            src={banknote.front_image || "/placeholder.svg"}
                            alt={`${banknote.denomination} ${banknote.currencies?.name} (${banknote.year})`}
                            fill
                            className="object-cover rounded-t-lg"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full bg-muted">
                            <CreditCard className="h-12 w-12 text-muted-foreground" />
                        </div>
                    )}
                </div>
                <CardContent className="p-4">
                    <h3 className="font-bold text-lg leading-tight truncate">
                        {banknote.denomination} {banknote.currencies?.name}
                    </h3>
                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                            <Badge variant="outline">{banknote.currencies?.code}</Badge>
                            {banknote.grade && <Badge variant="secondary">{banknote.grade}</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">{banknote.year}</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}