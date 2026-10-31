import React from 'react';
import type { Table, Relation } from '../../types/schema';
import { Trash2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const HEADER_HEIGHT = 44, COMMENT_HEIGHT = 26, ROW_HEIGHT = 32;
// Distinct color per relation type — purposefully very different hues
export const REL_COLOR: Record<string,string> = {
  '1:1': '#10b981', // emerald green
  '1:N': '#f59e0b', // amber/orange
  'N:M': '#e879f9', // fuchsia/pink
};

function getPort(table:Table,columnId:string,targetX:number){
  const w = table.width ?? 280;
  const idx=table.columns.findIndex(c=>c.id===columnId);
  const extraH=table.comment?COMMENT_HEIGHT:0;
  const y=table.position.y+HEADER_HEIGHT+extraH+idx*ROW_HEIGHT+ROW_HEIGHT/2;
  const isRight=targetX > table.position.x + w/2;
  const x=isRight?table.position.x+w:table.position.x;
  return {x,y,isRight};
}

function cardinality(type:'1:1'|'1:N'|'N:M'){
  if(type==='1:1')return{srcMany:false,tgtMany:false};
  if(type==='1:N')return{srcMany:false,tgtMany:true};
  return{srcMany:true,tgtMany:true};
}

function ErdMark({x,y,isRight,isMany,color}:{x:number;y:number;isRight:boolean;isMany:boolean;color:string}){
  const d=isRight?1:-1;
  return(
    <g stroke={color} strokeWidth={1.8} fill='none' strokeLinecap='round'>
      <circle cx={x+d*6} cy={y} r={4}/>
      {isMany?(
        <>
          <line x1={x+d*13} y1={y} x2={x+d*23} y2={y-7}/>
          <line x1={x+d*13} y1={y} x2={x+d*23} y2={y}/>
          <line x1={x+d*13} y1={y} x2={x+d*23} y2={y+7}/>
        </>
      ):(
        <>
          <line x1={x+d*13} y1={y-7} x2={x+d*13} y2={y+7}/>
          <line x1={x+d*18} y1={y-7} x2={x+d*18} y2={y+7}/>
        </>
      )}
    </g>
  );
}

interface RelationshipLinesProps{
  tables:Table[];relations:Relation[];selectedRelationId:string|null;hoveredRelationId:string|null;
  onSelectRelation:(id:string)=>void;onDeleteRelation:(id:string)=>void;
  onHoverRelation:(id:string|null)=>void;
  onChangeRelationType?:(id:string,type:'1:1'|'1:N'|'N:M')=>void;
}

export const RelationshipLines: React.FC<RelationshipLinesProps> = ({
  tables,relations,selectedRelationId,hoveredRelationId,
  onSelectRelation,onDeleteRelation,onHoverRelation,onChangeRelationType,
}) => {
  const { theme } = useTheme();
  return (
  <svg className="absolute inset-0 pointer-events-none overflow-visible z-0"
    style={{width:'10000px',height:'10000px'}}>
    {relations.map(rel=>{
      const src=tables.find(t=>t.id===rel.sourceTableId);
      const tgt=tables.find(t=>t.id===rel.targetTableId);
      if(!src||!tgt)return null;
      const isSelected=selectedRelationId===rel.id;
      const isHovered=hoveredRelationId===rel.id;
      const color=REL_COLOR[rel.type]??'#64748b';
      const active=isSelected||isHovered;
      // In light mode the line itself renders black for contrast/readability; the type badge keeps its color.
      const lineColor = theme === 'light' ? '#000000' : color;
      // Inactive = dimmed tint of the line color (not generic grey)
      const lc = active ? lineColor : lineColor + '70';
      const sp=getPort(src,rel.sourceColumnId,tgt.position.x);
      const tp=getPort(tgt,rel.targetColumnId,src.position.x);
      const sOff=sp.isRight?26:-26;
      const tOff=tp.isRight?26:-26;
      const curv=Math.max(Math.abs(tp.x-sp.x)*0.5,80);
      const c1x=sp.isRight?sp.x+curv:sp.x-curv;
      const c2x=tp.isRight?tp.x+curv:tp.x-curv;
      const path=`M${sp.x+sOff},${sp.y} C${c1x},${sp.y} ${c2x},${tp.y} ${tp.x+tOff},${tp.y}`;
      const midX=(sp.x+tp.x)/2;
      const midY=(sp.y+tp.y)/2;
      const{srcMany,tgtMany}=cardinality(rel.type);
      // Each type has a unique dash pattern too
      const dash = rel.type==='1:1' ? '10 4' : rel.type==='N:M' ? '3 5' : 'none';
      return(
        <g key={rel.id} className="pointer-events-auto cursor-pointer"
          onClick={e=>{e.stopPropagation();onSelectRelation(rel.id);}}
          onMouseEnter={()=>onHoverRelation(rel.id)}
          onMouseLeave={()=>onHoverRelation(null)}>
          <path d={path} fill="none" stroke="transparent" strokeWidth={22}/>
          {active&&<path d={path} fill="none" stroke={color} strokeWidth={8} strokeOpacity={0.15}/>}
          <path d={path} fill="none" stroke={lc} strokeWidth={active?2:1.5} strokeDasharray={dash}
            style={{transition:'stroke 0.15s'}}/>
          <ErdMark x={sp.x} y={sp.y} isRight={sp.isRight} isMany={srcMany} color={lc}/>
          <ErdMark x={tp.x} y={tp.y} isRight={tp.isRight} isMany={tgtMany} color={lc}/>
          <g transform={`translate(${midX},${midY})`}>
            <rect x={-18} y={-10} width={36} height={20} rx={10}
              fill={isSelected?color:'var(--bg-elevated)'}
              stroke={active?color:'#475569'} strokeWidth={1.2}/>
            <text x={0} y={4} textAnchor="middle"
              fill={isSelected?'#fff':active?color:'#94a3b8'}
              fontSize={9} fontFamily="ui-monospace,monospace" fontWeight="700">
              {rel.type}
            </text>
          </g>
          {isSelected&&(
            <foreignObject x={midX-90} y={midY+16} width={180} height={64} style={{overflow:'visible'}}>
              <div onMouseDown={e=>e.stopPropagation()}
                style={{background:'var(--bg-elevated)',border:`1.5px solid ${color}`,borderRadius:12,
                  padding:'7px 9px',display:'flex',flexDirection:'column',gap:5,
                  boxShadow:`0 8px 28px rgba(0,0,0,0.5),0 0 0 1px ${color}33`}}>
                <div style={{display:'flex',gap:5}}>
                  {(['1:1','1:N','N:M'] as const).map(t=>(
                    <button key={t} onMouseDown={e=>{e.stopPropagation();onChangeRelationType?.(rel.id,t);}}
                      style={{flex:1,padding:'4px 0',borderRadius:7,fontSize:10,fontFamily:'monospace',
                        fontWeight:700,cursor:'pointer',transition:'all 0.15s',
                        border:`1.5px solid ${rel.type===t?REL_COLOR[t]:'var(--border-subtle)'}`,
                        background:rel.type===t?REL_COLOR[t]:'var(--bg-input)',
                        color:rel.type===t?'#fff':'var(--text-muted)'}}>
                      {t}
                    </button>
                  ))}
                </div>
                <button onMouseDown={e=>{e.stopPropagation();onDeleteRelation(rel.id);}}
                  style={{display:'flex',alignItems:'center',justifyContent:'center',gap:5,
                    padding:'4px 0',borderRadius:7,fontSize:10,cursor:'pointer',fontWeight:600,
                    border:'1px solid rgba(239,68,68,0.4)',background:'rgba(239,68,68,0.1)',color:'#f87171'}}>
                  <Trash2 size={11}/> Delete relation
                </button>
              </div>
            </foreignObject>
          )}
        </g>
      );
    })}
  </svg>
  );
};
