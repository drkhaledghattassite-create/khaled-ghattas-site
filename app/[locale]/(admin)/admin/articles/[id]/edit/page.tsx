type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminArticleEditPage({ params }: Props) {
  const { id } = await params
  return <div>Edit article {id}</div>
}
