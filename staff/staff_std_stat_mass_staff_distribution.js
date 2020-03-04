function BuildReportItems( dest )
{
	filterMassRecruitDivisions = lib_app2.AppFeatureEnabled( 'classic_recruit' );

	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = divisions;
	queryParam.filters = new Object;
	queryParam.filters.is_active = true;
	queryParam.xqueryFieldNames = ['type_id'];

	divisionsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	for ( division in divisionsArray )
	{
		if ( filterMassRecruitDivisions && ! division.type_id.ForeignElem.is_mass_recruit_division )
			continue;

		if ( dest.filter.division_id.HasValue && ! lib_base.is_catalog_hier_child_or_self( divisions, division.id, dest.filter.division_id ) )
			continue;
		
		//lib_stat_v2.AddExplicitRecordGroupItem( dest, division, 'division_id' );
		dummyRecord = CreateElem( '//base2/base2_person.xmd', 'person' );
		dummyRecord.division_id = division.id;
		item = lib_stat_v2.ObtainRecordGroupItem( dest, dummyRecord );
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = persons;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.division_id = true;
	queryParam.filters = new Object;
	queryParam.filters.is_own_person = true;
	//queryParam.staticFilters.type_id = {'$in':['phone_interview','group_interview_reg','group_interview_result']};
	//queryParam.xqueryFieldNames = ['division_id'];

	personsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	
	for ( person in personsArray )
	{
		if ( filterMassRecruitDivisions && ! person.division_id.ForeignElem.type_id.ForeignElem.is_mass_recruit_division )
			continue;

		item = lib_stat_v2.ObtainRecordGroupItem( dest, person );

		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'employee_count', person );
	}


	queryParam = lib_stat_v2.CreateQueryParam();
	queryParam.catalog = positions;
	queryParam.dynFilters = new Object;
	queryParam.dynFilters.division_id = true;
	queryParam.filters = new Object;
	queryParam.filters.is_active = true;
	//queryParam.staticFilters.type_id = {'$in':['phone_interview','group_interview_reg','group_interview_result']};
	//queryParam.xqueryFieldNames = ['candidate_id'];

	positionsArray = lib_stat_v2.ExecQueryParam( dest, queryParam );
	
	for ( position in positionsArray )
	{
		if ( filterMassRecruitDivisions && ! position.division_id.ForeignElem.type_id.ForeignElem.is_mass_recruit_division )
			continue;

		item = lib_stat_v2.ObtainRecordGroupItem( dest, position );

		lib_stat_v2.AddItemFieldSourceRecord( dest, item, 'position_count', position );
	}
}


function FinalizeReportItem( dest, item )
{
	field = lib_stat_v2.CreateItemField( dest, item, 'free_position_count' );
	field.value = lib_stat_v2.GetItemFieldValue( dest, item, 'position_count' ) - lib_stat_v2.GetItemFieldValue( dest, item, 'employee_count' );
	
	if ( field.value > 0 )
		field.bkColor = '200,255,200';
	else if ( field.value < 0 )
		field.bkColor = '255,200,200';
}
