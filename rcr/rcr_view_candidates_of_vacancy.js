function BuildView()
{
	if ( ! curVacancyID.HasValue )
		return;

	if ( viewParam == undefined )
		viewParam = lib_view.build_view_param( 'candidates_of_vacancy_2' );

	queryStr = 'for $elem in candidates';
	queryStr += ' where MatchSome( $elem/spots/spot/vacancy_id, ' + curVacancyID.XQueryLiteral + ' )';
	
	if ( this.isCurrentSnapshot && global_settings.candidates_of_vacancy_view_depth.HasValue && curVacancy.is_active )
	{
		minDate = DateOffset( DateNewTime( CurDate ), 0 - global_settings.candidates_of_vacancy_view_depth * 86400 );
		queryStr += ' and $elem/state_date >= ' + XQueryLiteral( minDate );
	}

	if ( this.ChildExists( 'filter' ) && this.filter.used_fulltext.HasValue )
		queryStr += ' and doc-contains( $elem/id, \'data\', ' + this.filter.used_fulltext.XQueryLiteral + ', \'candidate\' )';

	queryStr += lib_view.build_xquery_qual( 'candidates_of_vacancy_2', this );

	queryStr += ' return $elem/Fields( ' + ArrayMerge( viewParam.xqueryFieldNames, 'CodeLiteral( This )', ',' ) + ' )';

	array = XQuery( queryStr );

	destCandidates = new Array;
	
	if ( this.targetGroups.ChildNum == 0 )
	{
		targetGroup = targetGroups.AddChild();
		targetGroup.id = 0;
		targetGroup.title = UiText.titles.currently_selected__candidates;
		targetGroup.textColor = 'black';

		targetGroup = targetGroups.AddChild();
		targetGroup.id = 1;
		targetGroup.title = UiText.titles.reserve;
		targetGroup.textColor = '60,60,60';

		targetGroup = targetGroups.AddChild();
		targetGroup.id = 2;
		targetGroup.title = UiText.titles.rejected__p;
		targetGroup.textColor = '255,0,0';
	}

	for ( targetState in this.targetStates )
		targetState.destCandidates = new Array;

	for ( targetGroup in this.targetGroups )
	{
		targetGroup.destCandidates = new Array;
		targetGroup.targetStates = new Array;
	}

	for ( candidate in array )
	{
		spot = candidate.spots.GetOptChildByKey( curVacancyID );
		if ( spot != undefined )
		{
			candidate.state_id = spot.state_id;
			candidate.state_date = spot.state_date;
			candidate.state_end_date = spot.state_end_date;

			if ( AppModuleUsed( 'module_midlandhunt' ) )
				candidate.last_comment = spot.last_comment;
		}

		destCandidates.push( candidate );

		targetState = targetStates.ObtainChildByKey( candidate.state_id );
		if ( targetState.group_id == null )
		{
			state = candidate.state_id.ForeignElem;

			if ( state.deactivate_object && ! ( state.change_vacancy_state && state.next_vacancy_state_id == 'vacancy_closed' ) )
				targetState.group_id = 2;
			else if ( state.event_occurrence_id == 'reserve' )
				targetState.group_id = 1;
			else
				targetState.group_id = 0;

			targetState.destCandidates = new Array;
		}

		targetState.destCandidates.push( candidate );

		targetGroup = this.targetGroups[targetState.group_id];
		targetGroup.destCandidates.push( candidate );
		//targetGroup.targetStates.push( targetState );
	}

	for ( targetState in ArraySelectAll( this.targetStates ) )
	{
		if ( targetState.destCandidates.length == 0 )
			targetState.Delete();
	}

	targetStates.Sort( 'state_id.ForeignElem.order_index', '+' )
	this.targetGroups.Sort( 'id', '+' );

	for ( targetGroup in this.targetGroups )
		targetGroup.targetStates = ArraySelectByKey( this.targetStates, targetGroup.id, 'group_id' );

	this.maxGroupTargetStatesNum = ArrayOptMax( ArrayExtract( this.targetGroups, 'This.targetStates.length' ) );

	leftColumnWidth = ArrayOptMax( ArrayExtract( this.targetGroups, 'CalcTextScreenWidth( This.title )' ) );
	leftColumnWidth = Max( leftColumnWidth, CalcTextScreenWidth( UiText.titles.all_candidates ) );
	leftColumnWidth += 0;

	for ( targetGroup in this.targetGroups )
	{
		if ( targetGroup.id == 2 )
		{
			targetGroup.widthMeasure = '-11px';
			continue;
		}

		width = ArrayOptMax( ArrayExtract( targetGroup.targetStates, 'CalcTextScreenWidth( This.state_id.ForeignDispName )' ) );
		width += MainScreen.ZrSize * 3 + 24;

		if ( targetGroup.id == 1 )
			width += 40;

		targetGroup.widthMeasure = width + 'px';
	}

	if ( this.selTargetStateID.HasValue && ( targetState = targetStates.GetOptChildByKey( this.selTargetStateID ) ) != undefined )
		selDestCandidates = targetState.destCandidates;
	else if ( this.selTargetGroupID.HasValue )
		selDestCandidates = targetGroups[this.selTargetGroupID].destCandidates;
	else
		selDestCandidates = this.destCandidates;
}


function SetCurVacancy( vacancy )
{
	curVacancyID = vacancy.id;
	curVacancy = curVacancyID.ForeignElem;
	this.isCurrentSnapshot = true;
	//filter.active_vacancy_id = curVacancyID;

	this.selTargetStateID.Clear();
	this.selTargetGroupID.Clear();

	Screen.Update();
}


function HandleSelectTargetState( targetState )
{
	this.selTargetStateID = targetState.state_id;
	this.selTargetGroupID.Clear();
}


function HandleSelectTargetGroup( targetGroup )
{
	this.selTargetStateID.Clear();
	this.selTargetGroupID = targetGroup.id;
}


function HandleClearTargetSelection()
{
	this.selTargetStateID.Clear();
	this.selTargetGroupID.Clear();
}


