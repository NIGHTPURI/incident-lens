package io.incidentlens.control;

import java.util.List;

public interface RcaProvider {
    Models.Report analyze(List<Models.Evidence> evidence);
}
