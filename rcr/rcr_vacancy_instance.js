function OnCheckReadAccess()
{
	if ( LdsCurUser.Name == 'person' && ( lib_app2.AppFeatureEnabled( 'rr_recruit' ) || AppModuleUsed( 'w4' ) ) )
		return;

	userAccess = LdsCurUser.access_role_id.ForeignElem;
	if ( userAccess.allow_all )
		return;

	check_exclusive_read_access( LdsCurUser );

	if ( userAccess.prohibit_view_other_user_vacancies && user_id != LdsCurUser.id )
		Cancel();

	if ( userAccess.prohibit_view_other_group_vacancies && ! LdsCurUser.matches_group( group_id ) )
		Cancel();

	if ( userAccess.prohibit_view_other_division_vacancies && ! lib_base.is_catalog_hier_child_or_self( divisions, division_id, lib_user.active_user_info.person_id.ForeignElem.division_id ) )
		Cancel();

	if ( userAccess.restrict_view_vacancies_with_recruit_type )
	{
		if ( user_id != LdsCurUser.id && recruit_type_id.HasValue && ! userAccess.vacancy_recruit_type_id.ByValueExists( recruit_type_id ) )
			Cancel();
	}
}


function image_url()
{
	if ( vacancy_id == id )
	{
		if ( is_active )
			return '//base_pict/vacancy.ico';
		else
			return '//base_pict/vacancy_inactive.ico';
	}

	if ( is_active )
		return '//base_pict/vacancy_instance.ico';
	else
		return '//base_pict/vacancy_instance_inactive.ico';
}


function days_in_state()
{
	if ( state_date == null || state_date >= CurDate )
		return 0;

	return lib_base.get_date_days_diff( CurDate, state_date );
}


