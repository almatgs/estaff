function SyncTargetRecruitPhases()
{
	for ( recruitPhase in lib_voc.get_sorted_voc( vacancy_recruit_phases ) )
	{
		targetRecruitPhase = target_recruit_phases.ObtainChildByKey( recruitPhase.id );
	}

	for ( targetRecruitPhase in ArraySelectAll( target_recruit_phases ) )
	{
		if ( targetRecruitPhase.recruit_phase_id.OptForeignElem == undefined )
			targetRecruitPhase.Delete();
	}

	target_recruit_phases.Sort( 'recruit_phase_id.ForeignElem.order_index', '+' );
}
