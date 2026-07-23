import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BanknoteDetailLoading() {
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      {/* Back button and actions */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-9 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Images */}
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-4">
              <Skeleton className="aspect-[4/3] w-full rounded-lg mb-4" />
              <Skeleton className="aspect-[4/3] w-full rounded-lg" />
              <div className="mt-4 flex justify-center gap-2">
                <Skeleton className="h-9 w-40" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle column - Details */}
        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-1 mb-4">
                <Skeleton className="h-10 w-3/4" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="collection">Collection Info</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Skeleton className="h-7 w-40 mb-4" />
                      {Array(5)
                        .fill(0)
                        .map((_, i) => (
                          <div key={i} className="grid grid-cols-[120px_1fr] gap-2 mb-2">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full" />
                          </div>
                        ))}
                    </div>

                    <div>
                      <Skeleton className="h-7 w-40 mb-4" />
                      {Array(3)
                        .fill(0)
                        .map((_, i) => (
                          <div key={i} className="grid grid-cols-[120px_1fr] gap-2 mb-2">
                            <Skeleton className="h-5 w-full" />
                            <Skeleton className="h-5 w-full" />
                          </div>
                        ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Related Items Section */}
      <div className="mt-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-[4/3] w-full rounded-t-lg" />
                <CardContent className="p-4">
                  <Skeleton className="h-6 w-full mb-2" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}
