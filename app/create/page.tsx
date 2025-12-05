import CreateForm from '../components/CreateForm'

export default function CreatePage() {
    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-black p-4 md:p-8 flex items-center justify-center">
            <div className="w-full">
                <CreateForm />
            </div>
        </main>
    )
}
