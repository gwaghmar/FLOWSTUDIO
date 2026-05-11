import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { listProjects } from "@/app/actions/project";
import { deleteProject } from "@/app/actions/project";
import { DIAGRAM_TYPE_META, TEMPLATES, getDiagramTypeMeta } from "@flowchart/core";
import type { DiagramType } from "@flowchart/core";
import { DiagramTypeIcon } from "@/components/diagram-icon";
import { Mic, ArrowUp, ChevronDown, Plus, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const email = session?.user?.email;
  const userName = session?.user?.name?.split(' ')[0] || "there";

  const projects = await listProjects();

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await deleteProject(id);
    redirect("/app");
  }

  return (
    <main className="relative min-h-0 w-full flex-1 flex flex-col overflow-y-auto bg-[#fdfaf6]">
      {/* The Vibrant Gradient Area */}
      <div className="relative w-full shrink-0 flex flex-col items-center justify-center overflow-hidden py-24 min-h-[480px]">
        {/* CSS/SVG Mesh Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-rose-500 to-orange-400 opacity-[0.85] blur-[80px] scale-150 rounded-full mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-tr from-sky-400 via-transparent to-transparent opacity-60 blur-[60px]" />
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-2xl px-6">
           {/* Small pill at top */}
           <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md rounded-full px-4 py-1.5 mb-8 shadow-sm cursor-pointer hover:bg-white/80 transition-colors">
             <div className="flex -space-x-1">
               <div className="h-4 w-4 rounded-full bg-orange-500 border border-white/50 flex items-center justify-center"><Sparkles size={8} className="text-white"/></div>
               <div className="h-4 w-4 rounded-full bg-blue-500 border border-white/50 flex items-center justify-center"><Sparkles size={8} className="text-white"/></div>
             </div>
             <span className="text-xs font-bold text-slate-800">Power your diagrams with AI ➔</span>
           </div>
           
           <h1 className="text-[36px] md:text-[44px] font-bold text-slate-900 mb-8 tracking-tight drop-shadow-sm text-center">Got an idea, {userName}?</h1>
           
           <form action="/app/editor" className="w-full bg-[#fcfcfc] rounded-[24px] shadow-2xl p-2 flex flex-col border border-white/60 relative focus-within:ring-4 focus-within:ring-indigo-500/20 transition-all">
             <textarea 
               name="prompt"
               className="w-full bg-transparent px-5 pt-5 pb-3 text-slate-800 text-[16px] focus:outline-none resize-none min-h-[110px] placeholder:text-slate-400 placeholder:font-medium leading-relaxed"
               placeholder="Ask FlowStudio to create a diagram..."
             />
             <div className="flex items-center justify-between px-3 pb-2 pt-2">
               <button type="button" className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                 <Plus size={18} />
               </button>
               <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[13px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">Build <ChevronDown size={14}/></span>
                  <button type="button" className="text-slate-400 hover:text-slate-600 p-1 transition-colors"><Mic size={18} /></button>
                  <button type="submit" className="bg-slate-900 text-white rounded-full p-2 shadow-sm hover:bg-slate-800 transition-colors">
                    <ArrowUp size={18} strokeWidth={2.5} />
                  </button>
               </div>
             </div>
           </form>
        </div>
      </div>

      {/* Projects and Templates Area */}
      <div className="relative z-20 flex-1 w-full bg-[#fdfaf6] rounded-t-[32px] px-6 pt-8 pb-20 shadow-[0_-8px_30px_rgb(0,0,0,0.03)] border-t border-slate-100/50 -mt-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <div className="flex items-center bg-white rounded-full p-1 shadow-sm border border-slate-200">
              <button className="px-5 py-1.5 text-[13px] font-semibold text-slate-900 bg-slate-100 rounded-full shadow-sm border border-slate-200/50 transition-colors">My projects</button>
              <button className="px-5 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Recently viewed</button>
              <button className="px-5 py-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 transition-colors">Templates</button>
            </div>
            <button className="text-[13px] font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 transition-colors">Browse all ➔</button>
          </div>
          
          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                <Sparkles className="text-slate-400" size={20} />
              </div>
              <p className="mt-4 text-[15px] font-semibold text-slate-800">No diagrams yet</p>
              <p className="mt-1 text-sm text-slate-500">Use the prompt above to create your first diagram</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((p) => {
                const meta = getDiagramTypeMeta((p.diagramType as DiagramType) ?? "mermaid");
                return (
                  <div
                    key={p.id}
                    className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <Link href={`/app/editor?id=${p.id}`} className="absolute inset-0 rounded-2xl" aria-label={p.title} />
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-slate-100">
                        <DiagramTypeIcon type={p.diagramType as DiagramType} size={20} className="text-slate-600" />
                      </div>
                      <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-1">{meta.label}</span>
                    </div>
                    <p className="text-[15px] font-semibold text-slate-900 line-clamp-1 mb-1">{p.title}</p>
                    <p className="text-[13px] text-slate-500">
                      {new Date(p.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <form action={handleDelete} className="relative z-10 mt-4 self-end">
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="text-[12px] font-medium text-rose-500 opacity-0 group-hover:opacity-100 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-all"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
